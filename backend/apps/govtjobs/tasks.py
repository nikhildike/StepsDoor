"""
Celery tasks for the govtjobs module.

Implements the govt-jobs half of the Data Pipeline described in the repo's
CLAUDE.md: Celery Beat periodically triggers `scrape_all_govtjob_portals`,
which dispatches one `scrape_govtjob_portal` task per active govt-job
`ScraperSource`; each of those runs the portal's Scrapy spider, whose
`GovtJobPipeline` upserts results into the `GovtJob` model. `fetch_ncs_jobs`
is a placeholder for the NCS API integration, and `match_govtjob_alerts`
notifies users whose saved `GovtJobAlert` matches newly scraped jobs.
"""
import logging
from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=300)
def scrape_govtjob_portal(self, portal_name: str):
    """
    Run the Scrapy spider for a single govt job portal.
    Reads spider_name and start URL from ScraperSource in the DB.

    Invoked per-portal by `scrape_all_govtjob_portals` (itself triggered on a
    schedule by Celery Beat), or manually for a single portal. Retries up to
    3 times with a 5-minute delay on failure (bind=True gives access to
    `self.retry`), since scraper failures are often transient (network
    hiccups, portal downtime).
    """
    from scrapy.crawler import CrawlerProcess
    from scrapy.utils.project import get_project_settings
    from apps.tenders.models import ScraperSource

    try:
        source = ScraperSource.objects.get(
            source_portal=portal_name,
            source_type=ScraperSource.TYPE_GOVT_JOB,
            is_active=True,
        )
    except ScraperSource.DoesNotExist:
        # Portal may have been deactivated/removed since this task was queued — nothing to do
        logger.warning(f"No active govt job ScraperSource found for portal: {portal_name}")
        return

    try:
        import os
        os.environ.setdefault('SCRAPY_SETTINGS_MODULE', 'scrapers.settings')
        settings = get_project_settings()

        process = CrawlerProcess(settings)
        process.crawl(
            source.spider_name,
            start_url=source.url,
            source_portal=source.source_portal,
        )
        process.start()

        # Record the successful run so admins/monitoring can see when this portal was last scraped
        source.last_scraped_at = timezone.now()
        source.save(update_fields=['last_scraped_at'])
        logger.info(f"Scraped govt job portal: {portal_name}")
    except Exception as exc:
        logger.exception(f"Govt job scraper failed for {portal_name}: {exc}")
        raise self.retry(exc=exc)


@shared_task
def scrape_all_govtjob_portals():
    """Dispatch scrape tasks for every active govt job source in ScraperSource.

    Invoked periodically by Celery Beat (analogous to the tenders pipeline's
    `scrape_all_portals` — see the repo's CLAUDE.md Data Pipeline section) to
    fan out one `scrape_govtjob_portal` task per active portal so each portal
    scrapes independently and failures don't block one another.
    """
    from apps.tenders.models import ScraperSource

    portals = ScraperSource.objects.filter(
        source_type=ScraperSource.TYPE_GOVT_JOB, is_active=True
    ).values_list('source_portal', flat=True)

    count = 0
    for portal_name in portals:
        scrape_govtjob_portal.delay(portal_name)
        count += 1
    logger.info(f"Dispatched {count} govt job scrape task(s).")


@shared_task
def fetch_ncs_jobs():
    """
    Fetch government jobs from the National Career Service (NCS) API.
    TODO (Week 6): Implement after NCS partner registration is complete.
    Docs: https://www.ncs.gov.in (Partner integration section)

    Intended to be scheduled alongside the portal scrapers once the NCS
    partner integration is live; currently a no-op placeholder that only logs.
    """
    logger.info("fetch_ncs_jobs: NCS API integration pending partner registration.")


@shared_task
def match_govtjob_alerts():
    """
    Match govt jobs published in the last 24 hours against active GovtJobAlerts.

    Invoked periodically by Celery Beat after scraping runs (mirroring
    `match_tender_alerts` in the tenders pipeline), so job seekers with a
    saved `GovtJobAlert` get notified about newly scraped listings that match
    their keyword/state/category filters.
    """
    from datetime import timedelta
    from django.db.models import Q
    from apps.govtjobs.models import GovtJob, GovtJobAlert

    since = timezone.now() - timedelta(hours=24)
    # Only consider jobs newly inserted in the last day so alerts aren't re-fired for old listings
    new_jobs = GovtJob.objects.filter(created_at__gte=since, is_active=True)

    if not new_jobs.exists():
        return

    alerts = GovtJobAlert.objects.filter(is_active=True).select_related('user')
    matched = 0

    for alert in alerts:
        # Build up an AND of only the filters the user actually set; an alert
        # with no filters at all should match every new job (see `filters else new_jobs` below)
        filters = Q()
        if alert.keyword:
            filters &= Q(title__icontains=alert.keyword) | Q(organisation__icontains=alert.keyword)
        if alert.state:
            filters &= Q(state=alert.state)
        if alert.category:
            filters &= Q(category=alert.category)

        matching = new_jobs.filter(filters) if filters else new_jobs
        count = matching.count()

        if count:
            matched += count
            # TODO: Week 10 — call notification service to send email/push
            logger.info(f"GovtJob alert match: {alert.user.email} — {count} new job(s)")

    logger.info(f"Govt job alert matching done. {matched} notifications queued.")

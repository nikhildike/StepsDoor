"""
Celery tasks for the govtjobs module.
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

        source.last_scraped_at = timezone.now()
        source.save(update_fields=['last_scraped_at'])
        logger.info(f"Scraped govt job portal: {portal_name}")
    except Exception as exc:
        logger.exception(f"Govt job scraper failed for {portal_name}: {exc}")
        raise self.retry(exc=exc)


@shared_task
def scrape_all_govtjob_portals():
    """Dispatch scrape tasks for every active govt job source in ScraperSource."""
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
    """
    logger.info("fetch_ncs_jobs: NCS API integration pending partner registration.")


@shared_task
def match_govtjob_alerts():
    """
    Match govt jobs published in the last 24 hours against active GovtJobAlerts.
    """
    from datetime import timedelta
    from django.db.models import Q
    from apps.govtjobs.models import GovtJob, GovtJobAlert

    since = timezone.now() - timedelta(hours=24)
    new_jobs = GovtJob.objects.filter(created_at__gte=since, is_active=True)

    if not new_jobs.exists():
        return

    alerts = GovtJobAlert.objects.filter(is_active=True).select_related('user')
    matched = 0

    for alert in alerts:
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

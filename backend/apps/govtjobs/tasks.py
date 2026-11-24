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


@shared_task
def scrape_govtjob_portal(portal_name: str):
    """
    Run the Scrapy spider for a single govt job portal and return the run's status.

    Hands the active govt-job `ScraperSource` to `apps.tenders.scraping.run_source()`,
    which crawls it in a child process and records a ScraperLog (shared with tender runs).
    Invoked per-portal by `scrape_all_govtjob_portals` (Celery Beat fan-out) or the admin
    "Scrape now" action. No Celery-level retry, for the same reasons as
    `apps.tenders.tasks.scrape_portal`.
    """
    from apps.tenders.models import ScraperSource
    from apps.tenders.scraping import run_source

    source = ScraperSource.objects.filter(
        source_portal=portal_name, source_type=ScraperSource.TYPE_GOVT_JOB, is_active=True,
    ).first()
    if source is None:
        # Portal may have been deactivated/removed since this task was queued — nothing to do
        logger.warning(f"No active govt job ScraperSource found for portal: {portal_name}")
        return None
    return run_source(source).status


@shared_task
def scrape_all_govtjob_portals(expires_seconds: int = 5 * 3600):
    """Dispatch one `scrape_govtjob_portal` task per active govt job source.

    Celery Beat calls this every 6 hours (`setup_scraper_schedule`), mirroring the
    tenders pipeline's `scrape_all_portals`. `expires_seconds` (default 5 h, under the
    interval) drops queued runs that didn't start before the next round, so a worker
    outage doesn't leave duplicate runs piled up. Returns the number of tasks queued.
    """
    from apps.tenders.models import ScraperSource

    portals = list(ScraperSource.objects.filter(
        source_type=ScraperSource.TYPE_GOVT_JOB, is_active=True
    ).values_list('source_portal', flat=True))
    for portal_name in portals:
        scrape_govtjob_portal.apply_async(args=[portal_name], expires=expires_seconds)
    logger.info(f"Dispatched {len(portals)} govt job scrape task(s).")
    return len(portals)


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
    Email each user a digest of new govt jobs matching their active GovtJobAlerts.

    Runs daily via Celery Beat (`setup_scraper_schedule`), mirroring
    `apps.tenders.tasks.match_tender_alerts`: each alert is matched against active
    govt jobs created since its `last_checked_at`, and
    `apps.notifications.alert_emails.send_alert_digests` sends one email per user.
    Returns its counts dict.
    """
    from zoneinfo import ZoneInfo
    from django.conf import settings
    from django.db.models import Q
    from apps.govtjobs.models import GovtJob, GovtJobAlert
    from apps.notifications.alert_emails import AlertKind, DigestItem, send_alert_digests
    IST = ZoneInfo('Asia/Kolkata')  # application deadlines are IST; show them as such

    def match(alert, since):
        """Active govt jobs created after `since` that pass every filter the alert sets."""
        qs = GovtJob.objects.filter(is_active=True, created_at__gt=since)
        if alert.keyword:
            qs = qs.filter(Q(title__icontains=alert.keyword) | Q(organisation__icontains=alert.keyword))
        if alert.state:
            qs = qs.filter(state__iexact=alert.state)
        if alert.category:
            qs = qs.filter(category=alert.category)
        return qs.order_by('application_deadline', '-created_at')

    def to_item(job):
        """Digest line: title, then organisation · last date to apply."""
        details = [job.organisation]
        if job.application_deadline:
            details.append(f"apply by {timezone.localtime(job.application_deadline, IST):%d %b %Y}")
        return DigestItem(
            title=job.title,
            url=f'{settings.FRONTEND_URL}/govt-jobs/{job.pk}',
            details=' · '.join(d for d in details if d),
        )

    counts = send_alert_digests(
        GovtJobAlert.objects.filter(is_active=True).select_related('user'),
        AlertKind(noun='government jobs', label='government job', user_of=lambda a: a.user, match=match, to_item=to_item),
    )
    logger.info(f"match_govtjob_alerts: {counts}")
    return counts

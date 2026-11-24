"""
Celery tasks for the tenders module.

Scheduling is managed via django-celery-beat (DatabaseScheduler).
After `python manage.py migrate`, add periodic tasks in the Django admin
at /admin/django_celery_beat/periodictask/.

Recommended schedule:
  - scrape_all_portals    → every 6 hours
  - match_tender_alerts   → every 6 hours (after scraping)
  - expire_stale_listings → once a day (covers govt jobs too)

Each portal's crawl runs in its own child process (see apps.tenders.scraping).
"""
import logging
from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)

@shared_task
def scrape_portal(portal_name: str):
    """
    Run the Scrapy spider for a single tender portal and return the run's status.

    Looks up the active tender `ScraperSource` keyed by `source_portal` and hands it to
    `apps.tenders.scraping.run_source()`, which crawls it in a child process and records a
    ScraperLog. Called by `scrape_all_portals` (Celery Beat fan-out) or ad hoc via the
    "Scrape selected sources now" admin action (`ScraperSourceAdmin.scrape_now`).

    No Celery-level retry: Scrapy already retries failed requests (RETRY_TIMES in
    scrapers/settings.py), and re-running a whole crawl that failed because its selectors
    no longer match would just fail again. The next scheduled run is the retry.
    """
    from apps.tenders.models import ScraperSource
    from apps.tenders.scraping import run_source

    source = ScraperSource.objects.filter(
        source_portal=portal_name, source_type=ScraperSource.TYPE_TENDER, is_active=True,
    ).first()
    if source is None:
        # Portal may have been deactivated/removed since it was queued — skip rather than error.
        logger.warning(f"No active tender ScraperSource found for portal: {portal_name}")
        return None
    return run_source(source).status


@shared_task
def scrape_all_portals():
    """
    Dispatch scrape tasks for every active tender source in the ScraperSource registry.

    This is the entry point Celery Beat calls on its recommended every-6-hours schedule
    (configured via django-celery-beat's PeriodicTask admin, not in code). It only fans out
    one `scrape_portal.delay()` call per portal — the actual scraping happens asynchronously
    in those child tasks so a slow/broken portal can't block the others.
    """
    from apps.tenders.models import ScraperSource

    # Only TYPE_TENDER sources here — govt job portals have their own equivalent task
    # (apps.govtjobs.tasks.scrape_all_govtjob_portals) filtering TYPE_GOVT_JOB.
    sources = ScraperSource.objects.filter(
        source_type=ScraperSource.TYPE_TENDER, is_active=True
    ).values_list('source_portal', flat=True)
    count = 0
    for portal_name in sources:
        scrape_portal.delay(portal_name)
        count += 1
    logger.info(f"Dispatched {count} tender scrape task(s).")


@shared_task
def match_tender_alerts():
    """
    Match tenders published in the last 24 hours against active TenderAlerts.
    Queues push/email notifications for matching users.

    Intended to run on Celery Beat's every-6-hours schedule, right after
    `scrape_all_portals`, so newly scraped tenders get matched against alerts promptly.
    Can also be triggered manually (e.g. from the Django shell) for testing.
    """
    from datetime import timedelta
    from django.db.models import Q
    from apps.tenders.models import Tender, TenderAlert

    # 24h window: matches the every-6-hours Beat cadence with margin, so a tender scraped in
    # any of the last few runs still gets picked up even if match_tender_alerts is delayed.
    since = timezone.now() - timedelta(hours=24)
    new_tenders = Tender.objects.filter(created_at__gte=since, is_active=True)

    if not new_tenders.exists():
        # Nothing new — skip the (potentially large) alert loop entirely.
        return

    alerts = TenderAlert.objects.filter(is_active=True).select_related('user')
    matched = 0

    for alert in alerts:
        filters = Q()
        if alert.keyword:
            filters &= Q(title__icontains=alert.keyword) | Q(organisation__icontains=alert.keyword)
        if alert.state:
            filters &= Q(state=alert.state)
        if alert.category:
            filters &= Q(category=alert.category)
        if alert.min_value:
            filters &= Q(estimated_value__gte=alert.min_value)

        # An alert with no filters set at all matches every new tender (Q() is falsy/empty).
        matching = new_tenders.filter(filters) if filters else new_tenders
        count = matching.count()

        if count:
            matched += count
            # TODO: Week 10 — call notification service to send email/push
            logger.info(f"Alert match: {alert.user.email} — {count} new tender(s)")

    logger.info(f"Tender alert matching done. {matched} notifications queued.")


@shared_task
def expire_stale_listings():
    """
    Hide tenders and govt jobs that are no longer open, and close out dead scrape logs.

    Nothing else ever sets `is_active=False`, so without this task expired listings stay
    visible forever. Intended to run once a day via Celery Beat (any time; it's idempotent).
    A listing is hidden when either:

    1. Its deadline has passed (`submission_deadline` / `application_deadline`), or
    2. It hasn't been seen for `LISTING_STALE_DAYS` while its portal is scraping fine —
       i.e. the portal had a run that saved data within the last 2 days, yet this listing
       wasn't among the items saved since. Requiring a recent good run means a broken
       spider can never cause a portal's listings to be mass-hidden.

    Also marks ScraperLog rows stuck in RUNNING for more than twice `SCRAPER_RUN_TIMEOUT`
    as FAILED — those are runs whose process was killed before it could record a result.

    Returns a dict of counts for the Celery result / manual runs from the shell.
    """
    from datetime import timedelta
    from django.conf import settings
    from apps.govtjobs.models import GovtJob
    from apps.tenders.models import ScraperLog, ScraperSource, Tender

    now = timezone.now()
    stale_before = now - timedelta(days=settings.LISTING_STALE_DAYS)
    recently_ok = now - timedelta(days=2)
    counts = {}

    for model, deadline_field, source_type in (
        (Tender, 'submission_deadline', ScraperSource.TYPE_TENDER),
        (GovtJob, 'application_deadline', ScraperSource.TYPE_GOVT_JOB),
    ):
        active = model.objects.filter(is_active=True)
        # .update() skips save(), so search vectors aren't needlessly recomputed.
        counts[f'{model.__name__}_past_deadline'] = active.filter(
            **{f'{deadline_field}__lt': now}
        ).update(is_active=False)

        healthy_portals = ScraperSource.objects.filter(
            source_type=source_type, last_scraped_at__gte=recently_ok,
        ).values_list('source_portal', flat=True)
        counts[f'{model.__name__}_unseen'] = active.filter(
            source_portal__in=list(healthy_portals), updated_at__lt=stale_before,
        ).update(is_active=False)

    counts['dead_scraper_logs'] = ScraperLog.objects.filter(
        status=ScraperLog.Status.RUNNING,
        started_at__lt=now - timedelta(seconds=2 * settings.SCRAPER_RUN_TIMEOUT),
    ).update(
        status=ScraperLog.Status.FAILED,
        error_message='Run never finished — the crawl process was killed or the worker died.',
        finished_at=now,
    )

    logger.info(f"expire_stale_listings: {counts}")
    return counts

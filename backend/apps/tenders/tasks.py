"""
Celery tasks for the tenders module.

Scheduling is managed via django-celery-beat (DatabaseScheduler).
After `python manage.py migrate`, add periodic tasks in the Django admin
at /admin/django_celery_beat/periodictask/.

Recommended schedule:
  - scrape_all_portals  → every 6 hours
  - match_tender_alerts → every 6 hours (after scraping)
"""
import logging
from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)

@shared_task(bind=True, max_retries=3, default_retry_delay=300)
def scrape_portal(self, portal_name: str):
    """
    Run the Scrapy spider for a single portal.

    Looks up `spider_name` and start URL from the matching `ScraperSource` row in the DB
    (keyed by `source_portal`), then runs that spider synchronously inside the Celery worker
    process. The spider's `TenderPipeline.process_item()` handles the actual
    `Tender.objects.update_or_create()` dedup/write as items are yielded.

    Called either by `scrape_all_portals` (Celery Beat's every-6-hours schedule, one call per
    active tender `ScraperSource`) or ad hoc via the "Scrape selected sources now" admin
    action (`ScraperSourceAdmin.scrape_now`). Retries up to 3 times (5 min backoff) on any
    exception, e.g. transient network/portal errors.
    """
    from scrapy.crawler import CrawlerProcess
    from scrapy.utils.project import get_project_settings
    from apps.tenders.models import ScraperLog, ScraperSource

    try:
        source = ScraperSource.objects.get(source_portal=portal_name, is_active=True)
    except ScraperSource.DoesNotExist:
        # Portal may have been deactivated/removed since it was queued — skip rather than error.
        logger.warning(f"No active ScraperSource found for portal: {portal_name}")
        return

    log = ScraperLog.objects.create(portal=portal_name)  # starts life as Status.RUNNING (model default)
    try:
        import os
        os.environ.setdefault('SCRAPY_SETTINGS_MODULE', 'scrapers.settings')
        settings = get_project_settings()
        settings.set('SCRAPER_LOG_ID', log.id)

        process = CrawlerProcess(settings)
        # Pass start_url and source_portal so spiders can be dynamic
        process.crawl(
            source.spider_name,
            start_url=source.url,
            source_portal=source.source_portal,
        )
        process.start()

        log.status = ScraperLog.Status.SUCCESS
        source.last_scraped_at = timezone.now()
        source.save(update_fields=['last_scraped_at'])
    except Exception as exc:
        log.status = ScraperLog.Status.FAILED
        log.error_message = str(exc)
        logger.exception(f"Scraper failed for {portal_name}: {exc}")
        raise self.retry(exc=exc)
    finally:
        # Always stamp finish time and persist status, whether the run succeeded or failed
        # (the retry above re-raises, so this finally still runs before the task re-queues).
        log.finished_at = timezone.now()
        log.save()


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

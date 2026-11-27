"""Celery tasks for private-company careers jobs."""
import logging

from celery import shared_task

from .ats import PoliteFetcher
from .models import CareerSource
from .sync import sync_source

logger = logging.getLogger(__name__)


@shared_task
def fetch_all_career_sources():
    """Fetch every active `CareerSource` one after another (daily at 11:30 IST via Celery Beat).

    Runs sequentially with one shared `PoliteFetcher` so shared ATS hosts
    (api.lever.co, boards-api.greenhouse.io) still get at most ~1 request a
    second. Sources failing `CAREER_ALERT_AFTER_FAILURES` times in a row are
    logged at ERROR (usually the ATS changed its JSON). Returns a summary dict.
    """
    from django.conf import settings

    fetcher = PoliteFetcher()
    summary = {'sources': 0, 'failed': 0, 'created': 0, 'deactivated': 0}
    for source in CareerSource.objects.filter(is_active=True):
        result = sync_source(source, fetcher)
        summary['sources'] += 1
        summary['created'] += result.created
        summary['deactivated'] += result.deactivated
        if result.error:
            summary['failed'] += 1
            source.refresh_from_db(fields=['consecutive_failures'])
            log = logger.error if source.consecutive_failures >= settings.CAREER_ALERT_AFTER_FAILURES else logger.warning
            log('Careers fetch failed for %s (%s in a row): %s', source, source.consecutive_failures, result.error)
    logger.info('Careers fetch finished: %s', summary)
    return summary

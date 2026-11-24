"""
Run one ScraperSource's spider in a separate process.

Scrapy runs on Twisted's reactor, which can only be started once per Python
process. Celery workers are long-lived processes, so starting a crawl in-process
(the old approach) worked for the first task on each worker and then failed with
ReactorNotRestartable on every later one. Running `scrapy crawl` as a child
process gives every crawl a fresh reactor and isolates the worker from spider
crashes or memory growth.

Used by the Celery tasks `apps.tenders.tasks.scrape_portal` and
`apps.govtjobs.tasks.scrape_govtjob_portal` (which the admin "Scrape now" action and
the Beat fan-out tasks queue). The `run_scrapers` management command still runs
spiders in-process, which is fine for a one-shot CLI process.
"""
import logging
import os
import subprocess
import sys

from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)

# Keep only the end of a crashed crawl's output in ScraperLog.error_message —
# the traceback is at the bottom and Scrapy's full log can run to megabytes.
OUTPUT_TAIL_CHARS = 3000


def run_source(source):
    """
    Crawl one `ScraperSource` in a child `scrapy crawl` process and return its ScraperLog.

    Creates the ScraperLog row up front and passes its id to the spider
    (`-a scraper_log_id=...`), so `scrapers.pipelines.ScraperLogPipeline` fills
    in the counts and final status when the spider closes. This function only
    handles what the pipeline can't: the process crashing, being killed, or
    exceeding `SCRAPER_RUN_TIMEOUT`, all of which leave the row FAILED.

    Spiders get `CLOSESPIDER_TIMEOUT` a couple of minutes below the hard timeout
    so long crawls normally stop themselves cleanly (recorded as PARTIAL with the
    data kept) and the hard kill is only a backstop for a hung process.

    Does not check `source.is_active` — callers decide whether a source should run.
    """
    from apps.tenders.models import ScraperLog

    log = ScraperLog.objects.create(portal=source.source_portal)
    timeout = settings.SCRAPER_RUN_TIMEOUT
    command = [
        sys.executable, '-m', 'scrapy', 'crawl', source.spider_name,
        '-a', f'start_url={source.url}',
        '-a', f'source_portal={source.source_portal}',
        '-a', f'scraper_log_id={log.id}',
        '-s', f'CLOSESPIDER_TIMEOUT={max(timeout - 120, 60)}',
        '-s', 'LOG_LEVEL=INFO',
    ]
    env = {
        **os.environ,
        'SCRAPY_SETTINGS_MODULE': 'scrapers.settings',
        # Child must use the same Django settings (and so the same database) as this process.
        'DJANGO_SETTINGS_MODULE': settings.SETTINGS_MODULE,
        'PYTHONIOENCODING': 'utf-8',  # portal text includes Devanagari etc.; avoid cp1252 crashes on Windows
    }

    failure = None
    try:
        result = subprocess.run(
            command,
            cwd=settings.BASE_DIR,  # scrapy.cfg lives in backend/
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,  # Scrapy logs to stderr; merge so the tail has the traceback
            text=True,
            encoding='utf-8',
            errors='replace',
            timeout=timeout,
        )
        if result.returncode != 0:
            failure = f"Crawl process exited with code {result.returncode}.\n\n{result.stdout[-OUTPUT_TAIL_CHARS:]}"
    except subprocess.TimeoutExpired:
        # subprocess.run kills the child before raising.
        failure = f"Crawl process killed after {timeout}s (SCRAPER_RUN_TIMEOUT)."

    log.refresh_from_db()
    if failure or log.status == ScraperLog.Status.RUNNING:
        # Either the process failed outright, or it exited cleanly without the
        # pipeline finalizing the log (e.g. the spider name didn't resolve).
        # Overwrite any status the pipeline set: a crash after close is still a failure.
        log.status = ScraperLog.Status.FAILED
        log.error_message = failure or "Crawl process exited without recording a result."
        log.finished_at = log.finished_at or timezone.now()
        log.save(update_fields=['status', 'error_message', 'finished_at'])

    logger.info(f"Scrape of {source.source_portal}: {log.status} ({log.items_found} saved, {log.items_new} new)")
    return log

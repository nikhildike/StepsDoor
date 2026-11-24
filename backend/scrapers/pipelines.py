"""
Scrapy item pipelines — save scraped items to the Django database.

Scrapy runs on Twisted's async event loop. Django ORM is synchronous.
All ORM calls are wrapped in deferToThread() to avoid SynchronousOnlyOperation.

Registered in scrapers/settings.py under ITEM_PIPELINES, in this order:
  1. TenderPipeline   (300) — upserts items with a 'tender_id' key into Tender
  2. GovtJobPipeline  (301) — upserts items with a 'job_id' key into GovtJob
  3. ScraperLogPipeline (900) — counts saved items and records the run's
     outcome on a ScraperLog row, for both tender and govt-job spiders

Each saving pipeline ignores items that don't belong to it and passes them
through unchanged. After a successful save it tags the item with a private
'_created' flag (True for a new row, False for an update) so
ScraperLogPipeline can count new vs. updated rows without touching the DB
per item. Invoked by the Scrapy engine during any spider run, whether started
by `apps.tenders.scraping.run_source()` (Celery tasks), `run_scrapers`, or a
bare `scrapy crawl <spider_name>`.
"""
import logging
from zoneinfo import ZoneInfo

from dateutil import parser as dateutil_parser
from django.utils import timezone
from scrapy import signals
from twisted.internet.threads import deferToThread

from scrapers.state_map import state_from_portal

logger = logging.getLogger(__name__)

# Indian portals publish dates/times in IST without a timezone marker; the
# project's TIME_ZONE is UTC, so naive values must be pinned to IST explicitly
# or every deadline ends up stored 5.5 hours late.
PORTAL_TIMEZONE = ZoneInfo('Asia/Kolkata')


def _parse_dt(value):
    """
    Parse a loosely-formatted date/time string (as scraped from a portal page,
    e.g. '15/08/2026' or '15 Aug 2026 17:00') into a timezone-aware datetime.

    Called by both saving pipelines to normalize every date-like item field
    before it's stored. Uses dayfirst=True since Indian government portals
    write dates as DD/MM/YYYY rather than the US MM/DD/YYYY. Naive results are
    interpreted as IST (see PORTAL_TIMEZONE). Returns None if the value is
    empty or unparseable, so callers can fall back to a default (e.g.
    timezone.now()) instead of raising.
    """
    if not value:
        return None
    try:
        parsed = dateutil_parser.parse(str(value), dayfirst=True)
    except (ValueError, TypeError, OverflowError):
        return None
    if timezone.is_naive(parsed):
        parsed = parsed.replace(tzinfo=PORTAL_TIMEZONE)
    return parsed


def _is_open(deadline):
    """
    Return whether a listing should be visible given its closing date.

    Used for the `is_active` default on every upsert, so re-scraping a listing
    whose deadline has already passed doesn't resurrect it after
    `expire_stale_listings` hid it. A missing deadline counts as open.
    """
    return deadline is None or deadline >= timezone.now()


class TenderPipeline:
    """
    Persists scraped tender items (those with a 'tender_id' key) to the Tender
    model — targets tender portals handled by GenericTenderSpider and
    MahatendersSpider. Runs first in ITEM_PIPELINES (priority 300).
    """

    def process_item(self, item, spider):
        """
        Item-pipeline hook invoked by the Scrapy engine for every yielded
        item. Passes non-tender items through unchanged; for tenders, offloads
        the DB write to a worker thread and returns the Deferred (Scrapy
        awaits it before handing the item to the next pipeline).
        """
        if 'tender_id' not in item:
            return item
        return deferToThread(self._save_tender, dict(item))

    def _save_tender(self, item):
        """
        Upsert one tender item into the Tender model (runs in a worker thread).

        Returns the item tagged with `_created` so ScraperLogPipeline can
        count new vs. updated rows. Exceptions propagate to Scrapy, which logs
        them as errors and drops the item — that error count is what marks
        the run PARTIAL.
        """
        from apps.tenders.models import Tender

        submission_deadline = _parse_dt(item.get('submission_deadline'))
        defaults = {
            'title':               item.get('title', '').strip(),
            'description':         item.get('description', '').strip(),
            'organisation':        item.get('organisation', '').strip(),
            'state':               item.get('state', '').strip() or state_from_portal(item.get('source_portal', '')),
            'district':            item.get('district', '').strip(),
            'category':            item.get('category', 'other'),
            'reference_number':    item.get('reference_number', '').strip(),
            'estimated_value':     item.get('estimated_value'),
            'document_fee':        item.get('document_fee'),
            'emd_amount':          item.get('emd_amount'),
            'published_at':        _parse_dt(item.get('published_at')) or timezone.now(),
            'submission_deadline': submission_deadline,
            'opening_date':        _parse_dt(item.get('opening_date')),
            'source_url':          item.get('source_url', ''),
            'document_url':        item.get('document_url', ''),
            'is_active':           _is_open(submission_deadline),
        }

        obj, created = Tender.objects.update_or_create(
            source_portal=item['source_portal'],
            tender_id=item['tender_id'],
            defaults=defaults,
        )
        logger.debug(f"{'Created' if created else 'Updated'} tender: {obj.title[:60]}")
        item['_created'] = created
        return item


class GovtJobPipeline:
    """
    Persists scraped government job items (those with a 'job_id' key) to the
    GovtJob model — targets recruitment portals handled by
    GenericGovtJobSpider. Runs after TenderPipeline (priority 301).
    """

    def process_item(self, item, spider):
        """
        Item-pipeline hook. Passes non-govt-job items through unchanged; for
        govt jobs, offloads the DB write to a worker thread and returns the
        Deferred.
        """
        if 'job_id' not in item:
            return item
        return deferToThread(self._save_govtjob, dict(item))

    def _save_govtjob(self, item):
        """
        Upsert one govt job item into the GovtJob model (runs in a worker
        thread). Returns the item tagged with `_created`, as in
        TenderPipeline._save_tender().
        """
        from apps.govtjobs.models import GovtJob

        application_deadline = _parse_dt(item.get('application_deadline'))
        defaults = {
            'title':                item.get('title', '').strip(),
            'organisation':         item.get('organisation', '').strip(),
            'state':                item.get('state', '').strip() or state_from_portal(item.get('source_portal', '')),
            'category':             item.get('category', 'other'),
            'qualification':        item.get('qualification', '').strip(),
            'vacancy_count':        item.get('vacancy_count'),
            'age_limit':            item.get('age_limit', '').strip(),
            'salary_range':         item.get('salary_range', '').strip(),
            'application_start':    _parse_dt(item.get('application_start')),
            'application_deadline': application_deadline,
            'exam_date':            _parse_dt(item.get('exam_date')),
            'source_url':           item.get('source_url', ''),
            'notification_pdf_url': item.get('notification_pdf_url', ''),
            'published_at':         _parse_dt(item.get('published_at')) or timezone.now(),
            'is_active':            _is_open(application_deadline),
        }

        obj, created = GovtJob.objects.update_or_create(
            source_portal=item['source_portal'],
            job_id=item['job_id'],
            defaults=defaults,
        )
        logger.debug(f"{'Created' if created else 'Updated'} govt job: {obj.title[:60]}")
        item['_created'] = created
        return item


class ScraperLogPipeline:
    """
    Records one ScraperLog row per spider run, for tender and govt-job spiders
    alike. Runs last in ITEM_PIPELINES (priority 900) so it only sees items
    that were actually saved.

    The row is either the one pre-created by `apps.tenders.scraping.run_source()`
    (passed to the spider as `-a scraper_log_id=<id>`, which Scrapy sets as a
    spider attribute) or, for `run_scrapers`/bare `scrapy crawl` runs, a new
    row created here. The final status is decided on the `spider_closed`
    signal, because only that signal carries the crawl's finish reason.
    """

    def __init__(self):
        """Start the per-run counters; the log row itself is attached in open_spider()."""
        self.log = None
        self.items_found = 0  # items saved (created or updated) this run
        self.items_new = 0    # subset of items_found that were newly created

    @classmethod
    def from_crawler(cls, crawler):
        """
        Scrapy factory hook. Subscribes to `spider_closed` so the outcome can
        be recorded with the crawl's finish reason ('finished',
        'closespider_timeout', 'shutdown', ...), which pipelines' own
        close_spider() hook doesn't receive.
        """
        pipeline = cls()
        crawler.signals.connect(pipeline.spider_closed, signal=signals.spider_closed)
        return pipeline

    def open_spider(self, spider):
        """Attach (or create) this run's ScraperLog row off the reactor thread."""
        return deferToThread(self._open_sync, spider)

    def _open_sync(self, spider):
        """
        Synchronous half of open_spider(). Logs are keyed by the portal
        (`spider.source_portal_key`, e.g. 'mahatenders.gov.in'), not the
        spider name, so admins can filter run history per portal.
        """
        from apps.tenders.models import ScraperLog
        log_id = getattr(spider, 'scraper_log_id', None)
        if log_id:
            self.log = ScraperLog.objects.get(id=int(log_id))  # CLI -a args arrive as strings
        else:
            portal = getattr(spider, 'source_portal_key', None) or spider.name
            self.log = ScraperLog.objects.create(portal=portal)

    def process_item(self, item, spider):
        """Count items the saving pipelines persisted and strip the internal `_created` tag."""
        if '_created' in item:
            self.items_found += 1
            if item.pop('_created'):
                self.items_new += 1
        return item

    def spider_closed(self, spider, reason):
        """`spider_closed` signal handler — finalize the log off the reactor thread."""
        error_count = spider.crawler.stats.get_value('log_count/ERROR', 0)
        logger.info(
            f"[{getattr(spider, 'source_portal_key', spider.name)}] closed ({reason}): "
            f"{self.items_found} saved, {self.items_new} new, {error_count} error(s)."
        )
        return deferToThread(self._close_sync, spider, reason, error_count)

    def _close_sync(self, spider, reason, error_count):
        """
        Decide and persist the run's status, and stamp the source's
        `last_scraped_at` when the run produced data.

        - FAILED:  crawl didn't finish normally, or finished with zero items
                   (on a portal that normally lists items, zero almost always
                   means the selectors no longer match the page)
        - PARTIAL: items were saved, but errors were logged or the crawl was
                   cut off by CLOSESPIDER_TIMEOUT
        - SUCCESS: finished normally with items and no errors
        """
        from apps.tenders.models import ScraperLog, ScraperSource
        if self.log is None:
            return  # open_spider never completed (e.g. DB error); nothing to record

        Status = ScraperLog.Status
        if reason not in ('finished', 'closespider_timeout'):
            status, message = Status.FAILED, f"Crawl ended early: {reason}"
        elif self.items_found == 0:
            status, message = Status.FAILED, "Crawl finished but no items were saved — the page layout may have changed."
        elif reason == 'closespider_timeout':
            status, message = Status.PARTIAL, "Stopped at the time limit before the crawl finished."
        elif error_count:
            status, message = Status.PARTIAL, f"{error_count} error(s) logged during the crawl."
        else:
            status, message = Status.SUCCESS, ''

        self.log.status = status
        self.log.error_message = message
        self.log.items_found = self.items_found
        self.log.items_new = self.items_new
        self.log.finished_at = timezone.now()
        self.log.save()

        if status != Status.FAILED:
            # last_scraped_at means "last run that produced data"; expire_stale_listings
            # relies on it to only expire listings on portals that are scraping fine.
            # Matching spider_name too keeps a domain registered as both a tender and a
            # govt-job source (e.g. isro.gov.in) from stamping the source that didn't run.
            ScraperSource.objects.filter(
                source_portal=self.log.portal, spider_name=spider.name,
            ).update(last_scraped_at=self.log.finished_at)

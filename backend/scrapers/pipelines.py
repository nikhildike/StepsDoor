"""
Scrapy item pipelines — save scraped items to the Django database.

Scrapy runs on Twisted's async event loop. Django ORM is synchronous.
All ORM calls are wrapped in deferToThread() to avoid SynchronousOnlyOperation.

Registered in scrapers/settings.py under ITEM_PIPELINES (TenderPipeline then
GovtJobPipeline). Every item yielded by every spider in this project passes
through process_item() on both pipelines in order; each pipeline ignores items
that don't belong to it (based on whether the item has a 'tender_id' or
'job_id' key) and passes them through unchanged. Invoked by the Scrapy engine
during any spider run, whether started via `scrapy crawl <spider_name>` or by
the Celery scrape_portal task.
"""
import logging
from twisted.internet.threads import deferToThread
from dateutil import parser as dateutil_parser
from django.utils import timezone
from scrapers.state_map import state_from_portal

logger = logging.getLogger(__name__)


def _parse_dt(value):
    """
    Parse a loosely-formatted date/time string (as scraped from a portal page,
    e.g. '15/08/2026' or '15 Aug 2026') into a timezone-naive datetime.

    Called by both pipelines' _save_tender()/_save_govtjob() to normalize every
    date-like item field before it's stored. Uses dayfirst=True since Indian
    government portals write dates as DD/MM/YYYY rather than the US MM/DD/YYYY.
    Returns None if the value is empty or unparseable, so callers can safely
    fall back to a default (e.g. timezone.now()) instead of raising.
    """
    if not value:
        return None
    try:
        return dateutil_parser.parse(str(value), dayfirst=True)
    except (ValueError, TypeError):
        return None


class TenderPipeline:
    """
    Persists scraped tender items (those with a 'tender_id' key) to the Tender
    model — targets tender portals handled by GenericTenderSpider and
    MahatendersSpider. Registered as priority 300 in ITEM_PIPELINES
    (scrapers/settings.py), so it runs before GovtJobPipeline (301). Invoked by
    the Scrapy engine once per yielded item, for every spider run (`scrapy
    crawl <spider_name>` or via the Celery scrape_portal task).

    Also tracks a ScraperLog row (apps.tenders.models.ScraperLog) across the
    spider's lifetime via open_spider()/close_spider(), so each scrape run has
    an auditable record of how many tenders were found/created.
    """

    def open_spider(self, spider):
        """
        Scrapy engine hook fired once when the spider starts (before any
        requests are sent). Defers the actual ScraperLog lookup/creation to a
        worker thread (via deferToThread) since it does a synchronous Django
        ORM call and must not block Twisted's reactor thread. Returns the
        Deferred so Scrapy waits for it before proceeding.
        """
        return deferToThread(self._open_sync, spider)

    def _open_sync(self, spider):
        """
        Synchronous half of open_spider(), run in a worker thread. If the
        spider was launched with a `scraper_log_id` attribute (set by the
        Celery scrape_portal task when it pre-creates a ScraperLog row),
        reuses that row; otherwise creates a fresh ScraperLog keyed by the
        spider's `name` (e.g. 'generic_tender', 'mahatenders'). Stores the log
        on `self.log` for use by process_item()/close_spider().
        """
        from apps.tenders.models import ScraperLog
        log_id = getattr(spider, 'scraper_log_id', None)
        if log_id:
            self.log = ScraperLog.objects.get(id=log_id)
        else:
            self.log = ScraperLog.objects.create(portal=spider.name)

    def close_spider(self, spider):
        """
        Scrapy engine hook fired once when the spider finishes (crawl
        complete, cancelled, or errored). Defers the ScraperLog finalization
        to a worker thread for the same reason as open_spider() — the ORM
        write must not run on the reactor thread. Returns the Deferred.
        """
        return deferToThread(self._close_sync, spider)

    def _close_sync(self, spider):
        """
        Synchronous half of close_spider(), run in a worker thread. Marks the
        ScraperLog (if one was opened) as 'success' and stamps finished_at —
        only runs if `self.log` was set in _open_sync (defensive against a
        spider that failed before open_spider completed).
        """
        if hasattr(self, 'log'):
            self.log.status = 'success'
            self.log.finished_at = timezone.now()
            self.log.save()

    def process_item(self, item, spider):
        """
        Item-pipeline hook invoked by the Scrapy engine for every item yielded
        by any spider. Ignores items that aren't tenders (no 'tender_id' key —
        e.g. govt job items) by passing them through unchanged so
        GovtJobPipeline can handle them next. For tender items, offloads the
        actual DB write to a worker thread via deferToThread and returns the
        Deferred (Scrapy awaits it before passing the item further down the
        pipeline chain).
        """
        if 'tender_id' not in item:
            return item
        return deferToThread(self._save_tender, dict(item))

    def _save_tender(self, item):
        """
        Synchronous worker-thread body that upserts one tender item into the
        Tender model and updates the running ScraperLog counters. Called by
        process_item() via deferToThread for each tender item.
        """
        from apps.tenders.models import Tender

        defaults = {
            'title':               item.get('title', '').strip(),
            'description':         item.get('description', '').strip(),
            'organisation':        item.get('organisation', '').strip(),
            # state: prefer whatever the spider scraped from the page; if the portal
            # doesn't expose a state field, fall back to the domain->state lookup in
            # state_map.py (keyed off the portal's own domain, e.g. mahatenders.gov.in -> Maharashtra).
            'state':               item.get('state', '').strip() or state_from_portal(item.get('source_portal', '')),
            'district':            item.get('district', '').strip(),
            'category':            item.get('category', 'other'),
            'reference_number':    item.get('reference_number', '').strip(),
            'estimated_value':     item.get('estimated_value'),
            'document_fee':        item.get('document_fee'),
            'emd_amount':          item.get('emd_amount'),
            # published_at is required (non-nullable) — default to "now" if the portal
            # didn't expose or we couldn't parse a publish date, so the row is still valid.
            'published_at':        _parse_dt(item.get('published_at')) or timezone.now(),
            'submission_deadline': _parse_dt(item.get('submission_deadline')),
            'opening_date':        _parse_dt(item.get('opening_date')),
            'source_url':          item.get('source_url', ''),
            'document_url':        item.get('document_url', ''),
            'is_active':           True,
        }

        # Idempotent upsert: (source_portal, tender_id) is the dedup key defined on the
        # Tender model, so re-scraping the same portal/tender just refreshes `defaults`
        # instead of creating a duplicate row — safe to run on every Celery Beat cycle.
        obj, created = Tender.objects.update_or_create(
            source_portal=item['source_portal'],
            tender_id=item['tender_id'],
            defaults=defaults,
        )

        if hasattr(self, 'log'):
            self.log.tenders_found += 1
            if created:
                self.log.tenders_new += 1
            self.log.save(update_fields=['tenders_found', 'tenders_new'])

        logger.debug(f"{'Created' if created else 'Updated'} tender: {obj.title[:60]}")
        return item


class GovtJobPipeline:
    """
    Persists scraped government job items (those with a 'job_id' key) to the
    GovtJob model — targets recruitment portals handled by
    GenericGovtJobSpider. Registered as priority 301 in ITEM_PIPELINES
    (scrapers/settings.py), so it runs after TenderPipeline (300) and only
    acts on items TenderPipeline passed through untouched. Invoked by the
    Scrapy engine once per yielded item during any spider run.

    Unlike TenderPipeline, tracks found/new counts as simple instance
    attributes (no persisted ScraperLog) and logs a summary line on
    close_spider() instead.
    """

    def open_spider(self, spider):
        """
        Scrapy engine hook fired once when the spider starts. Resets the
        in-memory found/new counters for this run (no DB I/O needed here,
        unlike TenderPipeline.open_spider, so this runs synchronously on the
        reactor thread without deferToThread).
        """
        self.count_found = 0
        self.count_new = 0

    def close_spider(self, spider):
        """
        Scrapy engine hook fired once when the spider finishes. Logs a
        one-line summary of how many govt job items were found/created during
        the run, for visibility in scraper logs/Celery task output.
        """
        logger.info(f"[{spider.name}] GovtJobPipeline: {self.count_found} found, {self.count_new} new.")

    def process_item(self, item, spider):
        """
        Item-pipeline hook invoked by the Scrapy engine for every item that
        reaches this pipeline (after TenderPipeline). Ignores non-govt-job
        items (no 'job_id' key) by passing them through unchanged. For govt
        job items, offloads the DB write to a worker thread via deferToThread
        and returns the Deferred.
        """
        if 'job_id' not in item:
            return item
        return deferToThread(self._save_govtjob, dict(item))

    def _save_govtjob(self, item):
        """
        Synchronous worker-thread body that upserts one govt job item into the
        GovtJob model and updates the in-memory found/new counters. Called by
        process_item() via deferToThread for each govt job item.
        """
        from apps.govtjobs.models import GovtJob

        defaults = {
            'title':                item.get('title', '').strip(),
            'organisation':         item.get('organisation', '').strip(),
            # state: same fallback pattern as TenderPipeline — use the spider-scraped
            # value if present, else derive it from the portal's domain via state_map.py.
            'state':                item.get('state', '').strip() or state_from_portal(item.get('source_portal', '')),
            'category':             item.get('category', 'other'),
            'qualification':        item.get('qualification', '').strip(),
            'vacancy_count':        item.get('vacancy_count'),
            'age_limit':            item.get('age_limit', '').strip(),
            'salary_range':         item.get('salary_range', '').strip(),
            'application_start':    _parse_dt(item.get('application_start')),
            'application_deadline': _parse_dt(item.get('application_deadline')),
            'exam_date':            _parse_dt(item.get('exam_date')),
            'source_url':           item.get('source_url', ''),
            'notification_pdf_url': item.get('notification_pdf_url', ''),
            'published_at':         _parse_dt(item.get('published_at')) or timezone.now(),
            'is_active':            True,
        }

        # Idempotent upsert: (source_portal, job_id) is the dedup key defined on the
        # GovtJob model, so re-scraping the same portal/job just refreshes `defaults`
        # instead of creating a duplicate row.
        obj, created = GovtJob.objects.update_or_create(
            source_portal=item['source_portal'],
            job_id=item['job_id'],
            defaults=defaults,
        )

        self.count_found += 1
        if created:
            self.count_new += 1

        logger.debug(f"{'Created' if created else 'Updated'} govt job: {obj.title[:60]}")
        return item

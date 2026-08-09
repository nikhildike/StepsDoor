"""
Scrapy item pipelines — save scraped items to the Django database.

Scrapy runs on Twisted's async event loop. Django ORM is synchronous.
All ORM calls are wrapped in deferToThread() to avoid SynchronousOnlyOperation.
"""
import logging
from twisted.internet.threads import deferToThread
from dateutil import parser as dateutil_parser
from django.utils import timezone
from scrapers.state_map import state_from_portal

logger = logging.getLogger(__name__)


def _parse_dt(value):
    if not value:
        return None
    try:
        return dateutil_parser.parse(str(value), dayfirst=True)
    except (ValueError, TypeError):
        return None


class TenderPipeline:
    """Persists scraped tender items (those with a 'tender_id' key) to the Tender model."""

    def open_spider(self, spider):
        return deferToThread(self._open_sync, spider)

    def _open_sync(self, spider):
        from apps.tenders.models import ScraperLog
        log_id = getattr(spider, 'scraper_log_id', None)
        if log_id:
            self.log = ScraperLog.objects.get(id=log_id)
        else:
            self.log = ScraperLog.objects.create(portal=spider.name)

    def close_spider(self, spider):
        return deferToThread(self._close_sync, spider)

    def _close_sync(self, spider):
        if hasattr(self, 'log'):
            self.log.status = 'success'
            self.log.finished_at = timezone.now()
            self.log.save()

    def process_item(self, item, spider):
        if 'tender_id' not in item:
            return item
        return deferToThread(self._save_tender, dict(item))

    def _save_tender(self, item):
        from apps.tenders.models import Tender

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
            'submission_deadline': _parse_dt(item.get('submission_deadline')),
            'opening_date':        _parse_dt(item.get('opening_date')),
            'source_url':          item.get('source_url', ''),
            'document_url':        item.get('document_url', ''),
            'is_active':           True,
        }

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
    """Persists scraped govt job items (those with a 'job_id' key) to the GovtJob model."""

    def open_spider(self, spider):
        self.count_found = 0
        self.count_new = 0

    def close_spider(self, spider):
        logger.info(f"[{spider.name}] GovtJobPipeline: {self.count_found} found, {self.count_new} new.")

    def process_item(self, item, spider):
        if 'job_id' not in item:
            return item
        return deferToThread(self._save_govtjob, dict(item))

    def _save_govtjob(self, item):
        from apps.govtjobs.models import GovtJob

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
            'application_deadline': _parse_dt(item.get('application_deadline')),
            'exam_date':            _parse_dt(item.get('exam_date')),
            'source_url':           item.get('source_url', ''),
            'notification_pdf_url': item.get('notification_pdf_url', ''),
            'published_at':         _parse_dt(item.get('published_at')) or timezone.now(),
            'is_active':            True,
        }

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

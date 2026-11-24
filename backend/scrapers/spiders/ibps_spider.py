"""
Govt-job spider for the Institute of Banking Personnel Selection (ibps.in).

IBPS publishes openings in two lists, both server-rendered WordPress pages
whose entries are `div.detail-section` blocks wrapped in a link:

  - /index.php/recruitment/ — recruitments IBPS runs for other organisations
    (SBI, BPCL, J&K Bank, central institutes...). Each entry: organisation,
    post title, registration start date, end date; the link is the
    registration page on ibpsreg.ibps.in. Every entry here is a live opening.
  - /index.php/crp-updates/ — IBPS's own Common Recruitment Processes (PO,
    Clerk, RRB, SO) mixed with results, calendars and fraud warnings. Only
    "Notification for Common Recruitment Process ..." entries are openings;
    their closing date is inside the PDF, and entries stay listed for months,
    so only notifications published in the last CRP_MAX_AGE_DAYS are taken.

Registered as 'ibps'; a govt-job ScraperSource with spider_name='ibps' runs it.
"""
import logging
import re
from datetime import timedelta

import scrapy
from django.utils import timezone

logger = logging.getLogger(__name__)

BASE = 'https://www.ibps.in/index.php'
# A CRP's online registration window is about three weeks; anything older has closed.
CRP_MAX_AGE_DAYS = 30
# Organisation names on the recruitment list that are banks (category 'banking').
_BANK_MARKERS = ('bank', 'sbi', 'jkb', 'nabard', 'sidbi', 'exim')


def _clean(text):
    """Collapse whitespace runs to single spaces and strip the ends."""
    return ' '.join((text or '').split())


def _slug(url):
    """Stable id from a registration URL, e.g. https://ibpsreg.ibps.in/sbiameoct26/ → 'sbiameoct26'."""
    return url.rstrip('/').rsplit('/', 1)[-1] or url


class IbpsSpider(scrapy.Spider):
    """Crawls IBPS's recruitment list and recent CRP notifications (two requests per run)."""
    name = 'ibps'
    empty_ok = True  # both lists can be empty between cycles; a missing list is logged as an error

    def __init__(self, start_url=None, source_portal=None, *args, **kwargs):
        """Accepts run_source()'s standard args; both list pages are fixed."""
        super().__init__(*args, **kwargs)
        self.source_portal_key = source_portal or 'ibps.in'

    async def start(self):
        """Request both list pages."""
        yield scrapy.Request(f'{BASE}/recruitment/', callback=self.parse_recruitment, errback=self._errback)
        yield scrapy.Request(f'{BASE}/crp-updates/', callback=self.parse_crp, errback=self._errback)

    @staticmethod
    def _entries(response):
        """(texts, href) for each `div.detail-section` entry on a list page."""
        for section in response.css('div.detail-section'):
            texts = [_clean(t) for t in section.css('::text').getall() if _clean(t)]
            href = section.xpath('ancestor::a[1]/@href').get('')
            yield texts, href

    def parse_recruitment(self, response):
        """One item per recruitment IBPS conducts for another organisation."""
        entries = list(self._entries(response))
        if not response.css('div.detail-section') and 'detail-list' not in response.text:
            logger.error(f'[ibps] No recruitment list at {response.url} — page layout may have changed.')
            return
        for texts, href in entries:
            if len(texts) < 4 or not href:
                continue
            org, post, start, end = texts[0], texts[1], texts[2], texts[3]
            is_bank = any(m in org.lower() for m in _BANK_MARKERS)
            yield {
                'source_portal':        self.source_portal_key,
                'job_id':               f'rec:{_slug(href)}',
                'title':                f'{org} — {post}',
                'organisation':         f'{org} (conducted by IBPS)',
                'state':                'Central Govt',
                'category':             'banking' if is_bank else 'psu',
                'application_start':    start,
                'application_deadline': end,
                'exam_date':            None,
                'source_url':           href,  # the registration page
                'notification_pdf_url': '',
                'published_at':         start,
                'qualification':        '',
                'vacancy_count':        None,
                'age_limit':            '',
                'salary_range':         '',
            }

    def parse_crp(self, response):
        """One item per CRP notification published in the last CRP_MAX_AGE_DAYS."""
        entries = list(self._entries(response))
        if not entries:
            logger.error(f'[ibps] No CRP updates list at {response.url} — page layout may have changed.')
            return
        from scrapers.pipelines import _parse_dt  # shared IST-aware date parsing
        cutoff = timezone.now() - timedelta(days=CRP_MAX_AGE_DAYS)
        for texts, href in entries:
            if len(texts) < 2 or not href:
                continue
            date_text, headline = texts[0], texts[1]
            if not headline.lower().startswith('notification for common recruitment process'):
                continue  # results, calendars, corrigenda, advisories
            published = _parse_dt(date_text)
            if published is None or published < cutoff:
                continue
            crp = re.sub(r'^notification for common recruitment process( for)?\s*', '', headline, flags=re.I).strip()
            yield {
                'source_portal':        self.source_portal_key,
                'job_id':               f'crp:{crp.lower().replace(" ", "")}',
                'title':                f'IBPS Common Recruitment Process — {crp}',
                'organisation':         'Institute of Banking Personnel Selection (IBPS)',
                'state':                'Central Govt',
                'category':             'banking',
                'application_start':    date_text,
                'application_deadline': None,  # closing date is inside the notification PDF
                'exam_date':            None,
                'source_url':           f'{BASE}/crp-updates/',
                'notification_pdf_url': href if href.lower().endswith('.pdf') else '',
                'published_at':         date_text,
                'qualification':        '',
                'vacancy_count':        None,
                'age_limit':            '',
                'salary_range':         '',
            }

    def _errback(self, failure):
        """Log failed requests as errors so the run is marked PARTIAL/FAILED."""
        logger.error(f'[ibps] Request failed: {failure.request.url} — {failure.value!r}')

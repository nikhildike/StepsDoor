"""
Govt-job spider for the Union Public Service Commission (upsc.gov.in).

UPSC publishes openings in two places, both crawled here:
  - /active-examinations/ — a table of exams currently in progress: name,
    notice number, exam start date, last date to apply. Rows whose last date
    is "NA" are later stages (Mains, interviews) that nobody new can apply to,
    so they are skipped.
  - /advertisements/ — one row per direct-recruitment advertisement (each
    covers several posts, detailed in its PDF): number, upload date and the
    PDF's file name. The PDF's full URL is elsewhere in the page source.

Registered as 'upsc'; a govt-job ScraperSource with spider_name='upsc' and
url=https://upsc.gov.in/active-examinations/ runs it. Yields dicts with a
'job_id' key for GovtJobPipeline.
"""
import logging
import re

import scrapy

logger = logging.getLogger(__name__)

ORGANISATION = 'Union Public Service Commission (UPSC)'
BASE = 'https://upsc.gov.in'


def _clean(text):
    """Collapse whitespace runs to single spaces and strip the ends."""
    return ' '.join((text or '').split())


class UpscSpider(scrapy.Spider):
    """Crawls UPSC's active examinations and recruitment advertisements (two requests per run)."""
    name = 'upsc'
    empty_ok = True  # every exam window can be closed at once; missing tables are logged as errors instead

    custom_settings = {
        'DOWNLOAD_DELAY': 2,
    }

    def __init__(self, start_url=None, source_portal=None, *args, **kwargs):
        """Accepts run_source()'s standard args; both pages are fixed, so start_url is informational."""
        super().__init__(*args, **kwargs)
        self.source_portal_key = source_portal or 'upsc.gov.in'

    async def start(self):
        """Request both listing pages."""
        yield scrapy.Request(f'{BASE}/active-examinations/', callback=self.parse_exams, errback=self._errback)
        yield scrapy.Request(f'{BASE}/advertisements/', callback=self.parse_advertisements, errback=self._errback)

    def parse_exams(self, response):
        """One item per exam that still has (or recently had) an application window."""
        rows = response.css('table.exam-table tr.exam-table-row')
        if not rows:
            logger.error(f'[upsc] No exam rows at {response.url} — page layout may have changed.')
            return
        for row in rows:
            cells = [_clean(' '.join(c.css('::text').getall())) for c in row.css('td')]
            link = row.css('a::attr(href)').get()
            if len(cells) < 4 or not link:
                continue
            name, notice_no, exam_date, last_date = cells[:4]
            if last_date.upper() in ('NA', '', '—', '-'):
                continue  # later stage of an exam whose application window is long closed
            detail_url = response.urljoin(link)
            yield {
                'source_portal':        self.source_portal_key,
                # The detail-page slug is stable and unique; notice numbers are sometimes "—".
                'job_id':               'exam:' + link.strip('/').rsplit('/', 1)[-1],
                'title':                name,
                'organisation':         ORGANISATION,
                'state':                'Central Govt',
                'category':             'civil_services',
                'application_deadline': last_date,
                'exam_date':            exam_date,
                'source_url':           detail_url,
                'notification_pdf_url': '',
                'published_at':         None,  # not on the listing; pipeline uses first-seen time
                'qualification':        '',
                'vacancy_count':        None,
                'age_limit':            '',
                'salary_range':         '',
                'application_start':    None,
            }

    def parse_advertisements(self, response):
        """One item per recruitment advertisement, linked to its English PDF."""
        rows = [r for r in response.css('table.dbim-table tr') if r.css('td')]
        if not rows:
            logger.error(f'[upsc] No advertisement rows at {response.url} — page layout may have changed.')
            return
        # Full PDF URLs appear in the page source separately from the table; index by file name.
        pdf_urls = {url.rsplit('/', 1)[-1]: url for url in re.findall(r'https?://[^"\'\s<>]+?\.pdf', response.text)}
        for row in rows:
            cells = [_clean(' '.join(c.css('::text').getall())) for c in row.css('td')]
            match = re.search(r'(\d+)\s*-\s*(\d{4})', cells[0] if cells else '')
            if not match:
                continue
            number, year = match.groups()
            pdf_name = row.css('button.view-doc-btn::attr(title)').get('')
            yield {
                'source_portal':        self.source_portal_key,
                'job_id':               f'advt:{year}-{int(number):02d}',
                'title':                f'UPSC Recruitment Advertisement No. {number}/{year} (multiple posts)',
                'organisation':         ORGANISATION,
                'state':                'Central Govt',
                'category':             'civil_services',
                'application_deadline': None,  # closing date is inside the PDF
                'exam_date':            None,
                'source_url':           f'{BASE}/advertisements/',
                'notification_pdf_url': pdf_urls.get(pdf_name, ''),
                'published_at':         cells[1] if len(cells) > 1 else None,
                'qualification':        '',
                'vacancy_count':        None,
                'age_limit':            '',
                'salary_range':         '',
                'application_start':    cells[1] if len(cells) > 1 else None,
            }

    def _errback(self, failure):
        """Log failed requests as errors so the run is marked PARTIAL/FAILED."""
        logger.error(f'[upsc] Request failed: {failure.request.url} — {failure.value!r}')

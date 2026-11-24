"""
Govt-job spider for the Staff Selection Commission (ssc.gov.in).

ssc.gov.in is a JavaScript single-page app, so its HTML has no content. The
app reads a public JSON API on the same domain; this spider uses the endpoint
behind the site's "live exams" list:

    GET https://ssc.gov.in/api/admin/5.1/liveExams
    → {"statusCode": "200", "data": [{"id", "examName", "examYear",
       "applicationStartDate", "applicationEndDate", "examDate",
       "minAge", "maxAge", "attachments": [{"fileName", "path"}], ...}]}

These are exactly the exams with an application window, so no filtering by
title is needed except for Limited Departmental Competitive Examinations
(LDCE), which only serving government employees can sit.

Registered as 'ssc'; a govt-job ScraperSource with spider_name='ssc' runs it.
"""
import json
import logging

import scrapy

logger = logging.getLogger(__name__)

API = 'https://ssc.gov.in/api/admin/5.1/liveExams'
ORGANISATION = 'Staff Selection Commission (SSC)'
# Exams not open to the public (in-service promotions).
_DEPARTMENTAL_MARKERS = ('limited departmental', 'ldce')


class SscSpider(scrapy.Spider):
    """One request to SSC's live-exams API; one item per public exam."""
    name = 'ssc'
    empty_ok = True  # SSC often has no public exam open; an API error is logged instead

    def __init__(self, start_url=None, source_portal=None, *args, **kwargs):
        """Accepts run_source()'s standard args; the API URL is fixed."""
        super().__init__(*args, **kwargs)
        self.source_portal_key = source_portal or 'ssc.gov.in'

    async def start(self):
        """Request the live-exams API as the site's own app does."""
        yield scrapy.Request(
            API,
            headers={'Accept': 'application/json', 'Referer': 'https://ssc.gov.in/'},
            callback=self.parse,
            errback=self._errback,
        )

    def parse(self, response):
        """Turn each live, public exam into a govt-job item."""
        try:
            payload = json.loads(response.text)
        except ValueError:
            logger.error(f'[ssc] {API} did not return JSON — the API may have moved.')
            return
        exams = payload.get('data')
        if str(payload.get('statusCode')) != '200' or not isinstance(exams, list):
            logger.error(f"[ssc] Unexpected API response: {payload.get('statusCode')} {payload.get('statusMessage')}")
            return

        for exam in exams:
            name = (exam.get('examName') or exam.get('examDescription') or '').strip()
            if not name or any(m in name.lower() for m in _DEPARTMENTAL_MARKERS):
                continue
            attachments = exam.get('attachments') or []
            pdf = next((a for a in attachments if str(a.get('fileName', '')).lower().endswith('.pdf')), None)
            min_age, max_age = exam.get('minAge'), exam.get('maxAge')
            yield {
                'source_portal':        self.source_portal_key,
                'job_id':               f"exam:{exam.get('id')}",
                'title':                name,
                'organisation':         ORGANISATION,
                'state':                'Central Govt',
                'category':             'other',
                'application_start':    exam.get('applicationStartDate'),
                'application_deadline': exam.get('applicationEndDate'),  # ISO with Z — parsed as UTC
                'exam_date':            exam.get('examDate'),
                # Applications are made after logging in at ssc.gov.in; there's no per-exam public page.
                'source_url':           'https://ssc.gov.in/',
                'notification_pdf_url': (
                    'https://ssc.gov.in/api/attachment/' + str(pdf['path']).replace('\\', '/') if pdf and pdf.get('path') else ''
                ),
                'published_at':         None,
                'qualification':        '',
                'vacancy_count':        None,
                # maxAge 100 is SSC's placeholder for "no upper limit" (e.g. departmental exams)
                'age_limit':            f'{min_age}–{max_age} years' if min_age and max_age and max_age < 100 else '',
                'salary_range':         '',
            }

    def _errback(self, failure):
        """Log failed requests as errors so the run is marked FAILED."""
        logger.error(f'[ssc] Request failed: {failure.request.url} — {failure.value!r}')

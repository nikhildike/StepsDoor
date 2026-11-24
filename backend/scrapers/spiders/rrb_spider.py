"""
Govt-job spider for the Railway Recruitment Boards (rrbapply.gov.in).

All 21 RRBs recruit through Centralised Employment Notices (CENs) applied for
on one portal, www.rrbapply.gov.in. That portal is an Angular app; its home
page ticker of currently open CENs — number, title, application start and end
— is compiled into one of its JavaScript chunks as a literal list:

    initializeNotices(){this.notices=[{text:"🔔CEN No. 08/26 - STATION MASTER",
        startDate:"26.10.2026 (00:00) Hrs.",endDate:"25.11.2026 (23:59) Hrs."}, ...]

Chunk file names change on every deploy (main-ZSFRC7L3.js, chunk-CYQUEEDT.js),
so the spider discovers them: home page → main-*.js → each imported chunk until
one contains `initializeNotices`. If none does, it logs an ERROR (run FAILED),
which is the signal that the portal changed and this spider needs updating.

The ticker can list a CEN more than once (e.g. a deadline-extension notice);
the latest end date per CEN wins. Only the public portal page and its static
scripts are fetched — not the portal's application API.

Registered as 'rrb'; a govt-job ScraperSource with spider_name='rrb' runs it.
"""
import logging
import re

import scrapy

logger = logging.getLogger(__name__)

PORTAL = 'https://www.rrbapply.gov.in/'
ORGANISATION = 'Railway Recruitment Boards (RRB)'

_TICKER_RE = re.compile(r'initializeNotices\(\)\{this\.notices=\[(.*?)\]', re.S)
_ENTRY_RE = re.compile(r'\{text:"(.*?)",startDate:"(.*?)",endDate:"(.*?)"\}', re.S)
_CEN_RE = re.compile(r'CEN\s*No\.?\s*(\d{1,2})\s*/\s*(\d{2,4})', re.I)


def _ticker_date(text):
    """'25.11.2026 (23:59) Hrs.' → '25.11.2026 23:59' (a format _parse_dt reads as IST)."""
    match = re.match(r'\s*(\d{1,2}\.\d{1,2}\.\d{4})\s*(?:\((\d{1,2}:\d{2})\))?', text or '')
    if not match:
        return None
    day, time = match.groups()
    return f'{day} {time}' if time else day


def _unescape(text):
    """Decode the JS escapes the bundle uses (\\u{1F514}, \\u2013) and drop the 🔔 ticker icon."""
    text = re.sub(r'\\u\{([0-9a-fA-F]+)\}', lambda m: chr(int(m.group(1), 16)), text)
    text = re.sub(r'\\u([0-9a-fA-F]{4})', lambda m: chr(int(m.group(1), 16)), text)
    return ' '.join(text.replace('\U0001F514', '').split())


class RrbSpider(scrapy.Spider):
    """Reads the open-CEN ticker from the RRB application portal's scripts."""
    name = 'rrb'
    empty_ok = True  # between recruitment cycles no CEN is open; a missing ticker is logged as an error

    def __init__(self, start_url=None, source_portal=None, *args, **kwargs):
        """Accepts run_source()'s standard args; the portal URL is fixed."""
        super().__init__(*args, **kwargs)
        self.source_portal_key = source_portal or 'rrbapply.gov.in'
        self.pending_chunks = 0   # chunk requests still in flight
        self.ticker_found = False

    async def start(self):
        """Request the portal page to discover its current main script."""
        yield scrapy.Request(PORTAL, callback=self.parse_portal, errback=self._errback)

    def parse_portal(self, response):
        """Follow the page's main-*.js bundle."""
        main = re.search(r'src="(main-[A-Za-z0-9]+\.js)"', response.text)
        if not main:
            logger.error(f'[rrb] No main-*.js script on {response.url} — portal build changed.')
            return
        yield response.follow(main.group(1), callback=self.parse_main, errback=self._errback)

    def parse_main(self, response):
        """Look for the ticker in main-*.js itself, else fetch every chunk it imports."""
        yield from self.parse_chunk(response, counted=False)
        if self.ticker_found:
            return
        chunks = sorted(set(re.findall(r'(chunk-[A-Za-z0-9]+\.js)', response.text)))
        if not chunks:
            logger.error('[rrb] main bundle imports no chunks and has no ticker — portal build changed.')
            return
        self.pending_chunks = len(chunks)
        for chunk in chunks:
            yield response.follow(chunk, callback=self.parse_chunk, errback=self._chunk_errback)

    def parse_chunk(self, response, counted=True):
        """Extract ticker entries from a script containing `initializeNotices`; log if no chunk had it."""
        match = _TICKER_RE.search(response.text)
        if match and not self.ticker_found:
            self.ticker_found = True
            yield from self._items(match.group(1))
        if counted:
            self.pending_chunks -= 1
            if self.pending_chunks == 0 and not self.ticker_found:
                logger.error('[rrb] No chunk contains the open-CEN ticker (initializeNotices) — portal build changed.')

    def _items(self, ticker_source):
        """One item per CEN in the ticker, keeping the latest end date when a CEN appears twice."""
        cens = {}
        for raw_text, start, end in _ENTRY_RE.findall(ticker_source):
            text = _unescape(raw_text)
            cen = _CEN_RE.search(text)
            if not cen:
                continue
            number, year = cen.groups()
            year = year if len(year) == 4 else f'20{year}'
            key = f'{int(number):02d}/{year}'
            # Title is what follows "CEN No. 08/26 -"; drop extension notes after a colon.
            title = re.split(r'\s*[:]\s*', _CEN_RE.split(text, maxsplit=1)[-1].lstrip(' -–'), maxsplit=1)[0]
            entry = {'title': title, 'start': _ticker_date(start), 'end': _ticker_date(end)}
            previous = cens.get(key)
            if previous is None or self._later(entry['end'], previous['end']):
                # An extension notice keeps the original title, which is usually the cleaner one.
                if previous:
                    entry['title'] = previous['title']
                cens[key] = entry

        for key, entry in cens.items():
            yield {
                'source_portal':        self.source_portal_key,
                'job_id':               f'cen:{key}',
                'title':                f"RRB CEN {key} — {entry['title']}",
                'organisation':         ORGANISATION,
                'state':                'Central Govt',
                'category':             'railway',
                'application_start':    entry['start'],
                'application_deadline': entry['end'],
                'exam_date':            None,
                'source_url':           PORTAL,
                'notification_pdf_url': '',
                'published_at':         entry['start'],
                'qualification':        '',
                'vacancy_count':        None,
                'age_limit':            '',
                'salary_range':         '',
            }

    @staticmethod
    def _later(a, b):
        """Whether ticker date `a` ('dd.mm.yyyy HH:MM') is after `b`; unparseable dates never win."""
        from scrapers.pipelines import _parse_dt
        da, db = _parse_dt(a), _parse_dt(b)
        return da is not None and (db is None or da > db)

    def _chunk_errback(self, failure):
        """A failed chunk download still counts toward 'all chunks checked'."""
        self._errback(failure)
        self.pending_chunks -= 1

    def _errback(self, failure):
        """Log failed requests as errors so the run is marked PARTIAL/FAILED."""
        logger.error(f'[rrb] Request failed: {failure.request.url} — {failure.value!r}')

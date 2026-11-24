"""
Tender spider for Indian government portals running NIC eProcurement (GePNIC).

Most state tender portals (mahatenders.gov.in, etenders.hry.nic.in,
tntenders.gov.in, ...) plus the central eprocure.gov.in, defproc.gov.in and
several PSU portals run the same NIC software with identical markup, so one
spider covers all of them. Non-NIC websites are deliberately NOT handled: a
generic "scrape any table" fallback only produced navigation rows and
corrigendum notices, so on a non-NIC page this spider saves nothing and the
run is logged FAILED.

How an NIC portal exposes tenders without login:
  - The home page (/nicgep/app, or /eprocure/app on eprocure.gov.in) has a
    "Latest Tenders" table (`table#activeTenders`) with the 10 newest tenders:
    title, reference number, closing date, opening date. The full active list
    (FrontEndLatestActiveTenders) sits behind a captcha, so these 10 rows are
    all a crawl can see — the portal's own note says the box refreshes every
    15 minutes, so frequent runs catch more tenders.
  - Each row links to a detail page that only works within the same server
    session as the home page (cookies must be ON — the project default is off)
    and gives the NIC Tender ID, organisation chain, value, EMD, fees, dates,
    category and work description as `td.td_caption` / `td.td_field` pairs.

Items are keyed by the NIC Tender ID (e.g. 2026_HRY_562238_1), which is
unique per portal and stable across re-scrapes.

Run against one portal:
    cd backend/
    scrapy crawl generic_tender -a start_url=https://mahatenders.gov.in \\
        -a source_portal=mahatenders.gov.in
Celery (via apps.tenders.scraping.run_source) passes the same arguments from
the portal's ScraperSource row.
"""
import logging
import re
from urllib.parse import urlparse

import scrapy

logger = logging.getLogger(__name__)

# NIC Tender ID: YYYY_ORGCODE_NNNNNN_N, e.g. 2026_HRY_562238_1
_NIC_TENDER_ID_RE = re.compile(r'^\d{4}_[A-Za-z0-9]{2,20}_\d{3,9}_\d{1,3}$')

# "Product Category" / "Tender Category" text on the detail page → TenderCategory value.
# Checked in order; first keyword found in the lower-cased text wins.
_CATEGORY_KEYWORDS = [
    ('it', ('computer', 'software', 'it ', 'information technology', 'networking', 'electronic')),
    ('healthcare', ('medical', 'medicine', 'hospital', 'drug', 'pharma', 'health')),
    ('power', ('electrical', 'power', 'energy', 'solar', 'transformer')),
    ('transport', ('vehicle', 'transport', 'road', 'bridge', 'railway')),
    ('education', ('education', 'school', 'books', 'laboratory')),
    ('defence', ('defence', 'arms', 'ammunition')),
    ('civil', ('civil', 'construction', 'building', 'works')),
    ('supply', ('goods', 'supply', 'purchase', 'equipment', 'furniture')),
]


def _clean(text):
    """Collapse runs of whitespace (newlines/tabs from HTML) to single spaces and strip the ends."""
    return ' '.join((text or '').split())


def _parse_amount(text):
    """
    Convert an amount cell like '12,28,141' or '₹ 24,560.00' to a float.

    Returns None for blanks and the 'NA'/'Refer Document' placeholders NIC uses
    when a portal doesn't disclose the value.
    """
    cleaned = re.sub(r'[^\d.]', '', text or '')
    try:
        return float(cleaned) if cleaned else None
    except ValueError:
        return None


def _category(*texts):
    """Map NIC's free-text category fields to a TenderCategory value ('other' if nothing matches)."""
    haystack = ' '.join(t for t in texts if t).lower()
    for value, keywords in _CATEGORY_KEYWORDS:
        if any(k in haystack for k in keywords):
            return value
    return 'other'


class GenericTenderSpider(scrapy.Spider):
    """
    Scrapes the "Latest Tenders" box of one NIC eProcurement portal and each
    tender's detail page. Registered as 'generic_tender', the default
    spider_name for tender ScraperSource rows. Yields dicts with a 'tender_id'
    key, which TenderPipeline saves.
    """
    name = 'generic_tender'

    custom_settings = {
        'DOWNLOAD_DELAY': 3,
        'RANDOMIZE_DOWNLOAD_DELAY': True,
        # Detail links are tied to the home page's server session (JSESSIONID);
        # without cookies every detail request returns "session timed out".
        'COOKIES_ENABLED': True,
        # One request at a time keeps the session's requests in order and is
        # polite to portals that only list 10 tenders anyway.
        'CONCURRENT_REQUESTS_PER_DOMAIN': 1,
    }

    def __init__(self, start_url=None, source_portal=None, *args, **kwargs):
        """
        Constructed by Scrapy with `-a start_url=... -a source_portal=...`
        (from run_source() or the CLI). `start_url` may be the bare portal
        domain — the start request goes to its NIC home page (see
        start_requests). `source_portal` defaults to the URL's domain and tags
        every item (half of Tender's dedup key).
        """
        super().__init__(*args, **kwargs)
        if not start_url:
            raise ValueError('generic_tender needs -a start_url=<portal URL>')
        self.start_url = start_url
        self.source_portal_key = source_portal or urlparse(start_url).netloc.lower().removeprefix('www.')

    async def start(self):
        """
        Request the portal's NIC home page.

        A bare domain (or any URL not already pointing at the NIC app) is
        rewritten to `/nicgep/app`, except eprocure.gov.in which serves its
        app at `/eprocure/app`. Scrapy's meta-refresh handling would usually
        get there from the domain root anyway, but going direct saves a hop
        and avoids portals whose root is a different landing page.
        """
        parsed = urlparse(self.start_url)
        if parsed.path.rstrip('/').endswith('/app'):
            url = self.start_url
        else:
            app = '/eprocure/app' if parsed.netloc.endswith('eprocure.gov.in') else '/nicgep/app'
            url = f'{parsed.scheme or "https"}://{parsed.netloc}{app}'
        yield scrapy.Request(url, callback=self.parse, errback=self._errback)

    def parse(self, response):
        """
        Read the `table#activeTenders` rows and follow each to its detail page.

        Each row has four cells: "N. Title", reference number, closing date,
        opening date. The listing values travel with the request (cb_kwargs) as
        a fallback in case the detail page is missing a field.
        """
        rows = response.css('table#activeTenders tr')
        if not rows:
            logger.error(
                f"[{self.source_portal_key}] No NIC 'Latest Tenders' table at {response.url} — "
                "not an NIC eProcurement portal, or the page layout changed."
            )
            return

        for row in rows:
            cells = [_clean(' '.join(c.css('::text').getall())) for c in row.css('td')]
            link = row.css('a::attr(href)').get()
            if len(cells) < 4 or not link:
                continue  # spacer/"no tenders" rows
            listing = {
                'title': re.sub(r'^\d+\.\s*', '', cells[0]),  # drop the "1. " serial prefix
                'reference_number': cells[1],
                'submission_deadline': cells[2],
                'opening_date': cells[3],
                'portal_home': response.url,
            }
            yield response.follow(
                link, callback=self.parse_detail, cb_kwargs={'listing': listing}, errback=self._errback,
            )

    def parse_detail(self, response, listing):
        """
        Build the tender item from the detail page's caption/field cell pairs.

        Logs an ERROR and yields nothing when the page isn't a tender detail
        page (session expired, portal error) or lacks a valid NIC Tender ID —
        the item would otherwise need a different dedup key and could
        duplicate a properly-keyed row later. Errors mark the run PARTIAL.
        """
        fields = {}
        for caption in response.css('td.td_caption'):
            label = _clean(' '.join(caption.css('::text').getall()))
            value = _clean(' '.join(caption.xpath('following-sibling::td[1]//text()').getall()))
            if label and label not in fields:  # first occurrence wins; some labels repeat in fee/EMD sub-tables
                fields[label] = value

        tender_id = fields.get('Tender ID', '')
        if not _NIC_TENDER_ID_RE.match(tender_id):
            reason = 'session timed out' if 'timed out' in response.text.lower() else 'no Tender ID on page'
            logger.error(f"[{self.source_portal_key}] Skipped '{listing['title'][:60]}': detail page unusable ({reason}).")
            return

        def field(*labels):
            """First non-placeholder value among the given caption labels."""
            for label in labels:
                value = fields.get(label, '')
                if value and value.upper() not in ('NA', 'N/A', '-'):
                    return value
            return ''

        # "Haryana Government||Urban Local Bodies||MC Karnal" → readable chain
        org_chain = ' / '.join(p.strip() for p in field('Organisation Chain').split('||') if p.strip())
        description = field('Work Description', 'Title')

        yield {
            'source_portal':       self.source_portal_key,
            'tender_id':           tender_id,
            'reference_number':    field('Tender Reference Number') or listing['reference_number'],
            'title':               (field('Title') or listing['title'])[:500],
            'description':         description,
            'organisation':        org_chain[:500],
            'state':               '',  # pipeline fills this from the portal domain (state_map)
            'district':            field('Location')[:100],
            'category':            _category(field('Product Category'), field('Tender Category'), field('Sub category')),
            'estimated_value':     _parse_amount(field('Tender Value in ₹')),
            'document_fee':        _parse_amount(field('Tender Fee in ₹')),
            'emd_amount':          _parse_amount(field('EMD Amount in ₹')),
            'published_at':        field('Published Date'),
            'submission_deadline': field('Bid Submission End Date') or listing['submission_deadline'],
            'opening_date':        field('Bid Opening Date') or listing['opening_date'],
            # Detail URLs are session-bound and show "session timed out" to anyone
            # following them later, so users are sent to the portal's home page
            # (they can search it by Tender ID).
            'source_url':          listing['portal_home'],
            'document_url':        '',  # NIC tender documents are behind a captcha
        }

    def _errback(self, failure):
        """Log failed requests (network errors, non-2xx after retries) as errors so the run is marked PARTIAL/FAILED."""
        logger.error(f"[{self.source_portal_key}] Request failed: {failure.request.url} — {failure.value!r}")

"""
Generic tender spider for Indian government portals running NIC eProcurement software.

Most state tender portals (Maharashtra, Rajasthan, Karnataka, Kerala, etc.)
and the central eProcure portal all run the same NIC platform and share
identical HTML structure. This single spider handles all of them.

To run against a specific source registered in the DB:
    cd backend/
    scrapy crawl generic_tender -a source_portal=mahatenders.gov.in \\
        -s SCRAPY_SETTINGS_MODULE=scrapers.settings

Celery tasks call it automatically by passing start_url and source_portal.
"""
import re
import logging
import scrapy
from urllib.parse import urlparse, urljoin, parse_qs

# NIC eProcurement system Tender ID pattern: YYYY_ORGCODE_NNNNNN_N
# e.g. 2026_CoC_690646_1  or  2026_TCMPF_689416_1
_NIC_TENDER_ID_RE = re.compile(r'\b(\d{4}_[A-Za-z]{2,20}_\d{4,8}_\d{1,2})\b')

logger = logging.getLogger(__name__)

# NIC eProcurement — listing table selectors (same across all state portals)
NIC_ROW_SELECTORS = [
    'table#table1 tr',           # eprocure.gov.in
    'table.list_table tr',       # mahatenders and clones
    'table.tablebg tr',          # some NIC variants
    'table tr',                  # last resort — any table
]

# NIC eProcurement column layout:
# Col 0: "1. Full tender title text"
# Col 1: Reference No  (e.g. SMART/GAPCL/Goods/01/2026)
# Col 2: Closing Date
# Col 3: Bid Opening Date
NIC_TENDER_ID_COLS = [1, 2]     # reference number is column 1
NIC_TITLE_COLS     = [0]        # full title (with number prefix) is column 0
NIC_ORG_COLS       = [4, 5, 6]  # organisation rarely on listing page; try farther cols
NIC_DEADLINE_COLS  = [2, 3, 4]  # closing date is column 2

# Prefixes that indicate a row is a table header, not real data
_HEADER_PREFIXES = (
    'tender title', 'corrigendum title', 'sl.', 'sr.', 's.no', 'sno',
    'reference no', 'tender no', 'description', 'title',
)


def _clean(text):
    """Collapse any run of whitespace (including newlines/tabs from HTML) into single spaces and strip ends."""
    return ' '.join((text or '').split())


def _parse_amount(text):
    """Convert an Indian-currency-formatted string like '₹ 12,34,567.00' or 'Rs 1234567' to a float, stripping currency symbols/letters and thousands separators; returns None if it isn't parseable as a number."""
    if not text:
        return None
    cleaned = re.sub(r'[₹,RsINR\s]', '', text).strip()
    try:
        return float(cleaned)
    except (ValueError, TypeError):
        return None


class GenericTenderSpider(scrapy.Spider):
    """
    Handles Indian state/central tender portals running the shared NIC
    eProcurement platform automatically, without portal-specific code — most
    state tender portals (Maharashtra, Rajasthan, Karnataka, Kerala, etc.) and
    the central eprocure.gov.in portal share near-identical HTML structure, so
    one spider with a few CSS-selector fallback strategies covers all of them.
    Falls back through multiple CSS selector strategies (see NIC_ROW_SELECTORS)
    to find the tender listing table, and extracts the NIC-native Tender ID
    (see _NIC_TENDER_ID_RE) to key updates reliably even when reference
    numbers vary by department.

    Registered as the 'generic_tender' spider (matches ITEM_PIPELINES'
    TenderPipeline via each yielded item's 'tender_id' key). Run either
    manually via `scrapy crawl generic_tender -a source_portal=...`, or
    automatically by the Celery `scrape_portal` task, which passes
    `start_url`/`source_portal` sourced from a `ScraperSource` DB row
    (apps.tenders.models.ScraperSource).
    """
    name = 'generic_tender'

    custom_settings = {
        'DOWNLOAD_DELAY': 3,
        'RANDOMIZE_DOWNLOAD_DELAY': True,
    }

    def __init__(self, start_url=None, source_portal=None, *args, **kwargs):
        """
        Constructed by Scrapy when the spider is launched (CLI `-a` args or
        the Celery task's crawler-process kwargs supply start_url/source_portal).
        If start_url isn't provided, falls back to the first active
        ScraperSource row configured to use this spider, so it's still
        runnable standalone (e.g. `scrapy crawl generic_tender` with no args)
        for debugging. Sets self.start_urls (read by Scrapy to seed the
        crawl) and self.source_portal_key (derived from the URL's domain if
        no explicit source_portal was given) used to tag every scraped item.
        """
        super().__init__(*args, **kwargs)
        if not start_url:
            # If called without args, pick first active source from DB
            from apps.tenders.models import ScraperSource
            source = ScraperSource.objects.filter(
                is_active=True, spider_name='generic_tender'
            ).first()
            if source:
                start_url = source.url
                source_portal = source.source_portal
        self.start_urls = [start_url] if start_url else []
        self.source_portal_key = source_portal or (
            urlparse(start_url).netloc.lower().removeprefix('www.') if start_url else 'unknown'
        )

    # ------------------------------------------------------------------ #
    #  Entry point                                                          #
    # ------------------------------------------------------------------ #

    def parse(self, response):
        """
        Default Scrapy callback for every response to a start_url or a
        followed pagination link. Triggered automatically by the Scrapy
        engine for each request whose callback wasn't overridden. Locates the
        listing table's data rows, parses each into an item dict, and either
        follows the tender's detail-page link (yielding a Request with
        _parse_detail as the callback) or yields the item directly if no
        detail link was found. Also yields a follow-up Request for the next
        listing page, if pagination is present. Yields Items and/or Requests.
        """
        rows = self._find_rows(response)

        if not rows:
            logger.warning(
                f"[{self.source_portal_key}] No tender rows found on {response.url}. "
                "The portal may require login, use JavaScript, or have a different structure."
            )
            return

        found = 0
        for row in rows:
            item = self._parse_row(row, response)
            if item:
                found += 1
                detail_url = item.get('_detail_url')
                if detail_url:
                    yield response.follow(
                        detail_url,
                        callback=self._parse_detail,
                        cb_kwargs={'item': item},
                        errback=self._errback,
                    )
                else:
                    del item['_detail_url']
                    yield item

        logger.info(f"[{self.source_portal_key}] Found {found} tenders on {response.url}")

        # Pagination
        next_url = self._find_next_page(response)
        if next_url:
            yield response.follow(next_url, callback=self.parse, errback=self._errback)

    # ------------------------------------------------------------------ #
    #  Row parsing                                                          #
    # ------------------------------------------------------------------ #

    def _find_rows(self, response):
        """
        Try each selector strategy in NIC_ROW_SELECTORS (most-specific NIC
        table IDs/classes first, plain `table tr` as last resort), return the
        first that finds at least one row containing data cells (<td>).
        Called by parse() to locate the listing table before per-row parsing.
        Returns a list of row Selectors, or [] if nothing matched.
        """
        for selector in NIC_ROW_SELECTORS:
            rows = response.css(selector)
            # Skip header rows — need at least 3 data rows to be confident
            data_rows = [r for r in rows if r.css('td')]
            if len(data_rows) >= 1:
                return data_rows
        return []

    def _parse_row(self, row, response):
        """
        Convert a single tender listing <tr> into an item dict, or None if the
        row doesn't look like real tender data (too few cells, missing
        tender_id/title, a header row, a homepage-widget row that concatenates
        multiple tenders, etc — see the guard clauses below). Called by
        parse() for each row found by _find_rows().
        """
        cells = row.css('td')
        if len(cells) < 3:
            return None

        cell_texts = [_clean(' '.join(c.css('::text').getall())) for c in cells]

        def get_col(indices):
            # Return the first non-empty cell among the given column indices — NIC
            # portal column layouts vary slightly, so callers pass a priority list
            # (see NIC_TENDER_ID_COLS / NIC_TITLE_COLS / NIC_ORG_COLS / NIC_DEADLINE_COLS above).
            for i in indices:
                if i < len(cell_texts) and cell_texts[i]:
                    return cell_texts[i]
            return ''

        tender_id = get_col(NIC_TENDER_ID_COLS)
        title     = get_col(NIC_TITLE_COLS)
        org       = get_col(NIC_ORG_COLS)

        # Skip header rows — first cell starts with a known header keyword
        first_cell_lower = cell_texts[0].lower().strip() if cell_texts else ''
        if first_cell_lower.startswith(_HEADER_PREFIXES):
            return None

        if not tender_id or not title or len(title) < 5:
            return None

        # Skip rows where a single cell has concatenated multiple tenders (homepage summary widgets)
        # Real tender titles are under 400 chars; anything longer is a multi-tender dump
        if len(title) > 400:
            return None

        # Strip leading serial number like "1. " or "10. " from title
        title = re.sub(r'^\d+\.\s*', '', title).strip()

        # If tender_id looks like a date or is very long, it's probably the wrong column
        if re.match(r'^\d{2}[/-]', tender_id) or len(tender_id) > 100:
            return None

        # Skip rows where title is very short (likely a corrigendum type label like "Date", "Date7")
        if len(title) < 10:
            return None

        # Find the detail/apply link in this row
        detail_url = (
            cells[NIC_TITLE_COLS[0]].css('a::attr(href)').get() or
            row.css('a::attr(href)').get()
        )

        # Try to extract NIC Tender ID from the row link or data attributes
        # eprocure.gov.in embeds it as ?pk=2026_ORG_NNNNNN_N in the href
        early_nic_id = ''
        if detail_url:
            m = _NIC_TENDER_ID_RE.search(detail_url)
            if m:
                early_nic_id = m.group(1)
        # Also check the full row HTML for data attributes or hidden values
        if not early_nic_id:
            m = _NIC_TENDER_ID_RE.search(row.get())
            if m:
                early_nic_id = m.group(1)

        # Try to find a deadline in any remaining cell
        deadline = ''
        for i in NIC_DEADLINE_COLS:
            txt = cell_texts[i] if i < len(cell_texts) else ''
            if re.search(r'\d{2}[/-]\d{2}[/-]\d{2,4}', txt):
                deadline = txt
                break

        return {
            'source_portal':    self.source_portal_key,
            'tender_id':        tender_id,
            'reference_number': early_nic_id,  # may be refined further from detail page
            'title':            title,
            'organisation':     org,
            'state':            '',        # will try to get from detail page
            'description':      '',
            'district':         '',
            'category':         'other',
            'estimated_value':  None,
            'document_fee':     None,
            'emd_amount':       None,
            'published_at':     None,
            'submission_deadline': deadline,
            'opening_date':     None,
            'source_url':       response.urljoin(detail_url) if detail_url else response.url,
            'document_url':     '',
            '_detail_url':      detail_url,  # internal — stripped before yielding
        }

    # ------------------------------------------------------------------ #
    #  Detail page                                                          #
    # ------------------------------------------------------------------ #

    def _parse_detail(self, response, item):
        """
        Callback for the tender's detail page, invoked via response.follow()
        from parse() when a row had a detail URL. Extracts additional fields
        only available there — description, document URL, published/opening
        dates, EMD/estimated value, organisation, state, and a refined NIC
        Tender ID — merges them into `item` (passed in via cb_kwargs), and
        yields the completed item dict for the pipelines to save. Tries
        common NIC eProcurement detail page patterns since the exact markup
        varies slightly by state deployment.
        """
        # NIC portals use short-lived server sessions. If the session expired between
        # the listing request and the detail request, yield the item as-is.
        if 'session has timed out' in response.text.lower() or 'your session' in response.text.lower():
            item.pop('_detail_url', None)
            yield item
            return

        # Description: try common containers
        description = (
            _clean(' '.join(response.css('div.tender_description ::text').getall())) or
            _clean(' '.join(response.css('#tender_desc ::text').getall())) or
            _clean(' '.join(response.css('td.tender_desc ::text').getall())) or
            ''
        )

        # Document PDF link
        document_url = (
            response.css('a[href$=".pdf"]::attr(href)').get() or
            response.css('a:contains("Download")::attr(href)').get() or
            ''
        )

        # Try to find dates in table cells
        def find_label_value(labels):
            for label in labels:
                # Look for <td> or <th> containing the label, then get sibling <td>
                el = response.xpath(
                    f'//td[contains(translate(., "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz"), "{label.lower()}")]/following-sibling::td[1]/text()'
                ).get()
                if el:
                    return _clean(el)
            return None

        published = find_label_value(['publish date', 'published', 'bid start', 'start date'])
        emd = find_label_value(['emd', 'earnest money', 'bid security'])
        est_value = find_label_value(['estimated', 'approx value', 'tender value'])
        open_date = find_label_value(['opening date', 'bid opening', 'open date'])
        org = find_label_value(['department', 'organisation', 'organization', 'authority'])
        state = find_label_value(['state', 'location'])

        # Extract NIC system Tender ID (e.g. "2026_CoC_690646_1")
        # Strategy 1: URL query params — NIC portals put it in ?pk= or ?tenderId=
        nic_tender_id = None
        url_params = parse_qs(urlparse(response.url).query)
        for param in ('pk', 'tenderId', 'tenderRefId', 'tenderid', 'tid'):
            val = url_params.get(param, [None])[0]
            if val and _NIC_TENDER_ID_RE.match(val):
                nic_tender_id = val
                break
        # Strategy 2: regex scan of full page text for the YYYY_ORG_NNNNNN_N pattern
        if not nic_tender_id:
            m = _NIC_TENDER_ID_RE.search(response.text)
            if m:
                nic_tender_id = m.group(1)

        item.update({
            'description':      description,
            'document_url':     response.urljoin(document_url) if document_url else '',
            'published_at':     published or item.get('published_at'),
            'emd_amount':       _parse_amount(emd),
            'estimated_value':  _parse_amount(est_value),
            'opening_date':     open_date,
            'organisation':     org or item.get('organisation', ''),
            'state':            state or item.get('state', ''),
            'reference_number': nic_tender_id or item.get('reference_number', ''),
        })

        item.pop('_detail_url', None)
        yield item

    # ------------------------------------------------------------------ #
    #  Pagination                                                           #
    # ------------------------------------------------------------------ #

    def _find_next_page(self, response):
        """
        Try common 'Next' link patterns used by NIC portals. Called by
        parse() after processing the current page's rows. Returns the href
        of the first matching selector, or None if there's no next page
        (i.e. this is the last page of results).
        """
        for selector in [
            'a:contains("Next")::attr(href)',   # link literally labelled "Next"
            'a:contains("next")::attr(href)',   # lowercase variant
            'a:contains(">>")::attr(href)',     # arrow-style pagination label
            'a.next::attr(href)',               # common CSS class for the next-page control
            'a#nextPage::attr(href)',           # NIC eProcurement's specific pager element id
            'li.next a::attr(href)',            # Bootstrap-pagination style: <li class="next"><a>
        ]:
            href = response.css(selector).get()
            if href:
                return href
        return None

    def _errback(self, failure):
        """
        Scrapy errback attached to every request this spider issues (listing
        and detail-page follows). Invoked by the engine when a request fails
        (network error, non-2xx after retries exhausted, etc.) instead of
        raising into the spider; just logs a warning so one bad request
        doesn't crash the whole crawl. Returns nothing (swallows the failure).
        """
        logger.warning(f"[{self.source_portal_key}] Request failed: {failure.request.url} — {failure.value}")

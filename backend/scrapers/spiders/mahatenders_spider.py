"""
Spider for MahaTenders — https://mahatenders.gov.in

This is the first portal to implement (Week 3-4 of the build order).
The spider skeleton is in place; CSS/XPath selectors need to be filled in
after inspecting the live site structure.

To run manually:
    cd backend/
    scrapy crawl mahatenders -s SCRAPY_SETTINGS_MODULE=scrapers.settings

Portal info:
  - Runs on NIC eProcurement software (same as many other state portals)
  - Tender listing is paginated via form POST or URL params
  - Most fields are in HTML tables
  - Some portals require a session cookie from the home page first
"""
import scrapy


DEFAULT_SOURCE_PORTAL = 'mahatenders.gov.in'
DEFAULT_START_URL = 'https://mahatenders.gov.in/nicgep/app'  # TODO: confirm exact listing endpoint


class MahatendersSpider(scrapy.Spider):
    """
    Portal-specific spider for MahaTenders (Maharashtra state tender portal,
    https://mahatenders.gov.in). Exists as an example of a spider written for
    a portal that needs custom handling instead of the shared
    GenericTenderSpider selectors (e.g. a login/session requirement, unusual
    pagination, or listing markup that doesn't match the generic NIC
    selectors well enough). As noted in the module docstring, this skeleton's
    selectors are still placeholders pending inspection of the live site.

    Registered as the 'mahatenders' spider (matches ITEM_PIPELINES'
    TenderPipeline via each yielded item's 'tender_id' key). Run manually via
    `scrapy crawl mahatenders -s SCRAPY_SETTINGS_MODULE=scrapers.settings`, or
    automatically by the Celery `scrape_portal` task for a ScraperSource row
    whose `spider_name` is set to 'mahatenders'.
    """
    name = 'mahatenders'
    allowed_domains = ['mahatenders.gov.in']

    custom_settings = {
        'DOWNLOAD_DELAY': 4,
    }

    def __init__(self, start_url=None, source_portal=None, *args, **kwargs):
        """
        Constructed by Scrapy when the spider is launched. Unlike the generic
        spiders, this one doesn't fall back to a DB lookup — it always has a
        usable default (DEFAULT_START_URL/DEFAULT_SOURCE_PORTAL) so it can run
        standalone for development against the one portal it targets. Sets
        self.start_urls and self.source_portal_key used to tag every scraped item.
        """
        super().__init__(*args, **kwargs)
        self.start_urls = [start_url or DEFAULT_START_URL]
        self.source_portal_key = source_portal or DEFAULT_SOURCE_PORTAL

    def parse(self, response):
        """
        Parse the tender listing page.
        TODO: Inspect https://mahatenders.gov.in and fill in correct selectors.

        Expected structure (NIC eProcurement):
          <table class="list_table">
            <tr> ... <td>Tender ID</td> <td>Title</td> <td>Org</td> <td>Deadline</td> ... </tr>
          </table>

        This is the default Scrapy callback, triggered automatically by the
        engine for the response to each start_url and to any followed
        pagination link (self-recursive via the "Next page" yield below).
        For each row with a detail link, yields a Request (callback=
        parse_detail) to enrich the item; otherwise yields the item dict
        directly. Yields Items and/or Requests.
        """
        # TODO: Update selector to match actual listing table
        rows = response.css('table.list_table tr')  # placeholder selector — targets NIC eProcurement's tender listing table

        if not rows:
            self.logger.warning(
                f"No rows found on {response.url} — "
                "the page structure may have changed or requires a POST request. "
                "Inspect the live site and update the selector."
            )

        for row in rows[1:]:  # skip header row
            cells = row.css('td')
            if len(cells) < 4:
                continue

            # TODO: Adjust cell indices after inspecting the real table columns
            tender_id = cells[0].css('::text').get('').strip()      # placeholder: assumes col 0 is the tender ID
            title = cells[1].css('::text').get('').strip()          # placeholder: assumes col 1 is the title
            organisation = cells[2].css('::text').get('').strip()   # placeholder: assumes col 2 is the organisation
            deadline_text = cells[3].css('::text').get('').strip()  # placeholder: assumes col 3 is the submission deadline
            detail_url = cells[1].css('a::attr(href)').get('')      # link to the detail page, expected inside the title cell

            if not tender_id or not title:
                continue

            item = {
                'source_portal': self.source_portal_key,
                'tender_id': tender_id,
                'title': title,
                'organisation': organisation,
                'state': 'Maharashtra',
                'submission_deadline': deadline_text,
                'source_url': response.urljoin(detail_url) if detail_url else response.url,
                # Fields populated from detail page
                'description': '',
                'district': '',
                'category': 'other',   # TODO: detect from title keywords
                'estimated_value': None,
                'document_fee': None,
                'emd_amount': None,
                'opening_date': None,
                'document_url': '',
                'published_at': None,
            }

            if detail_url:
                yield response.follow(
                    detail_url,
                    callback=self.parse_detail,
                    cb_kwargs={'item': item},
                )
            else:
                yield item

        # Pagination — TODO: find the "Next" link selector
        next_page = response.css('a.next_page::attr(href)').get()  # placeholder selector for a "next page" control
        if next_page:
            yield response.follow(next_page, callback=self.parse)

    def parse_detail(self, response, item):
        """
        Parse the tender detail page for full description, dates, and document link.
        TODO: Fill in selectors after inspecting detail page HTML.

        Callback invoked via response.follow() from parse() for each row that
        had a detail link; `item` (the partial dict built in parse()) is
        passed in via cb_kwargs. Merges the detail-page fields into it and
        yields the completed item dict for TenderPipeline to save.
        """
        # TODO: Extract description from detail page
        description = ' '.join(
            response.css('div.tender_description ::text').getall()  # placeholder: assumed container for the full tender description
        ).strip()

        # TODO: Extract document download link
        document_url = response.css(
            'a[href$=".pdf"]::attr(href)'  # placeholder: first PDF link on the detail page
        ).get('')

        # TODO: Extract published date
        published_at = response.css(
            'td.publish_date::text'  # placeholder: assumed cell class for the publish date
        ).get('')

        # TODO: Extract EMD amount
        emd_text = response.css('td.emd_amount::text').get('')  # placeholder: assumed cell class for the EMD (earnest money deposit) amount

        item.update({
            'description': description,
            'document_url': response.urljoin(document_url) if document_url else '',
            'published_at': published_at,
            'emd_amount': self._parse_amount(emd_text),
        })

        yield item

    @staticmethod
    def _parse_amount(text):
        """Convert '₹ 12,34,567.00' or '1234567' to a Decimal-compatible string.

        Strips the rupee symbol, thousands-separator commas, and the 'Rs'
        prefix, then attempts a float conversion. Returns None if the
        cleaned text isn't numeric or the input is empty. Called by
        parse_detail() to normalize the scraped EMD amount text.
        """
        if not text:
            return None
        cleaned = text.replace('₹', '').replace(',', '').replace('Rs', '').strip()
        try:
            return float(cleaned)
        except ValueError:
            return None

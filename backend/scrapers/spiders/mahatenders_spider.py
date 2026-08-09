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
    name = 'mahatenders'
    allowed_domains = ['mahatenders.gov.in']

    custom_settings = {
        'DOWNLOAD_DELAY': 4,
    }

    def __init__(self, start_url=None, source_portal=None, *args, **kwargs):
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
        """
        # TODO: Update selector to match actual listing table
        rows = response.css('table.list_table tr')  # placeholder selector

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
            tender_id = cells[0].css('::text').get('').strip()
            title = cells[1].css('::text').get('').strip()
            organisation = cells[2].css('::text').get('').strip()
            deadline_text = cells[3].css('::text').get('').strip()
            detail_url = cells[1].css('a::attr(href)').get('')

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
        next_page = response.css('a.next_page::attr(href)').get()
        if next_page:
            yield response.follow(next_page, callback=self.parse)

    def parse_detail(self, response, item):
        """
        Parse the tender detail page for full description, dates, and document link.
        TODO: Fill in selectors after inspecting detail page HTML.
        """
        # TODO: Extract description from detail page
        description = ' '.join(
            response.css('div.tender_description ::text').getall()
        ).strip()

        # TODO: Extract document download link
        document_url = response.css(
            'a[href$=".pdf"]::attr(href)'
        ).get('')

        # TODO: Extract published date
        published_at = response.css(
            'td.publish_date::text'
        ).get('')

        # TODO: Extract EMD amount
        emd_text = response.css('td.emd_amount::text').get('')

        item.update({
            'description': description,
            'document_url': response.urljoin(document_url) if document_url else '',
            'published_at': published_at,
            'emd_amount': self._parse_amount(emd_text),
        })

        yield item

    @staticmethod
    def _parse_amount(text):
        """Convert '₹ 12,34,567.00' or '1234567' to a Decimal-compatible string."""
        if not text:
            return None
        cleaned = text.replace('₹', '').replace(',', '').replace('Rs', '').strip()
        try:
            return float(cleaned)
        except ValueError:
            return None

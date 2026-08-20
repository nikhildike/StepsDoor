"""
Generic govt job spider for Indian government recruitment portals.

Most Indian govt job portals (UPSC, SSC, Railways, state PSCs, etc.) publish
notifications as HTML tables or article lists. This spider tries common patterns
across those structures.

To run against a specific source registered in the DB:
    cd backend/
    scrapy crawl generic_govtjob -a source_portal=upsc.gov.in \\
        -s SCRAPY_SETTINGS_MODULE=scrapers.settings

Celery tasks call it automatically by passing start_url and source_portal.
"""
import re
import logging
import scrapy
from urllib.parse import urlparse

logger = logging.getLogger(__name__)


def _clean(text):
    """Collapse any run of whitespace (including newlines/tabs from HTML) into single spaces and strip ends."""
    return ' '.join((text or '').split())


def _parse_int(text):
    """Strip every non-digit character from text and parse what's left as an int (e.g. for vacancy counts like '12 posts'); returns None if nothing numeric remains."""
    if not text:
        return None
    digits = re.sub(r'[^\d]', '', text)
    return int(digits) if digits else None


# Common date patterns in Indian govt portals: DD/MM/YYYY or DD-MM-YYYY or DD Mon YYYY
DATE_PATTERN = re.compile(r'\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{1,2}\s+\w+\s+\d{4}')

# Navigation/website-section phrases that are NOT job postings.
# Checked as lowercase prefix or exact match against the link title.
_NAV_PREFIXES = (
    'about ', 'how to', 'candidate corner', 'contact', 'faq', 'frequently asked',
    'disclaimer', 'privacy', 'accessibility', 'terms and', 'sitemap', 'feedback',
    'grievance', 'photo gallery', 'activities', 'apply rti', 'apply online',
    'apply now', 'click here', 'what is', 'our vision', 'our mission',
    'acts and', 'act and', 'act &', 'website policy', 'user manual',
    'organisation chart', 'organizational chart', 'the founders', 'history of',
    'jurisdiction', 'important link', 'quick link', 'useful link',
    'screen reader', 'skip to', 'go to', 'back to',
    'right to information', 'public grievance', 'annual report',
    'old question', 'question paper', 'previous year', 'model question',
    'different section', 'duties and', 'duties &', 'functions of',
    'press note', 'press release', 'media', 'news and',
    'tender notice', 'e-tender', 'nit ', '{', '{{',
)

_NAV_EXACT = {
    'home', 'about', 'contact', 'login', 'logout', 'register', 'sign in',
    'sign up', 'more', 'download', 'faq', 'rti', 'news', 'events', 'gallery',
    'sitemap', 'activities', 'apply online', 'apply now', 'click here',
    'online application', 'online applications', 'online application information',
    'read more', 'know more', 'view more', 'see all', 'view all',
    'advertisement', 'notification', 'syllabus', 'answer key',
    'admit card', 'result', 'schedule', 'calendar', 'notice board',
    'important notice', 'latest news', 'new', 'old', 'archive',
    'recruitment', 'advertisement no', 'advt', 'circular', 'order',
    'related links', 'other links', 'resources', 'help', 'support',
    'tender', 'empanelment', 'corrigendum', 'addendum', 'errata',
    'whats new', "what's new", 'updates', 'flash news',
    'annual report', 'different sections', 'right to information',
    'public grievance portal', 'old questions', 'question papers',
    'duties & functions', 'press note', 'commission', 'examination',
}


# Keywords that indicate a real recruitment/job notice
_RECRUITMENT_RE = re.compile(
    r'recruit|vacanc|vacancy|\bpost\b|\bposts\b|notification|advt\b|advertis'
    r'|exam|examination|\bclerk\b|officer|engineer|inspector|constable|teacher'
    r'|lecturer|professor|assistant|manager|supervisor|director|junior|senior'
    r'|appoint|select|application form|admit card release|result declared'
    r'|joining letter|inet|cadet|apprentice|agniveer|specialist|technical'
    r'|accountant|auditor|analyst|scientist|researcher|pilot|doctor|nurse'
    r'|pharmacist|radiographer|health worker|anm\b|asha\b|iti\b|diploma'
    r'|combined|competitive|written test|interview|merit list|waiting list'
    r'|gazette.*\d{4}|category no|category nos',
    re.IGNORECASE
)


def _is_nav_title(title: str) -> bool:
    """Return True if the title looks like a navigation link, not a job posting."""
    t = title.strip().lower()
    if not t:
        return True
    # Too short to be a real job title
    if len(t) < 12:
        return True
    # Starts with a timestamp (* DD-MM-YYYY...)
    if t.startswith('*') or re.match(r'^\d{2}[-/]\d{2}[-/]\d{2,4}', t):
        return True
    # Template artifacts (JS not rendered)
    if '{{' in t or '{%' in t:
        return True
    # Exact match with known nav words
    if t in _NAV_EXACT:
        return True
    # Starts with a known nav phrase
    if t.startswith(_NAV_PREFIXES):
        return True
    # ALL CAPS single/two-word phrases are almost always buttons or section headers
    words = title.split()
    if len(words) <= 2 and title == title.upper() and title.isalpha():
        return True
    # Must contain at least one recruitment-related keyword
    if not _RECRUITMENT_RE.search(title):
        return True
    return False


class GenericGovtJobSpider(scrapy.Spider):
    """
    Handles Indian government recruitment portals (UPSC, SSC, Railways, state
    PSCs, and similar) automatically, without portal-specific code. Tries
    multiple common HTML patterns (table-based listings, then link-list
    listings) for job notification pages, and filters out navigation/menu
    links using heuristics (_is_nav_title, _RECRUITMENT_RE) since these
    portals mix real job notices with generic site-navigation links in the
    same DOM regions.

    Registered as the 'generic_govtjob' spider (matches ITEM_PIPELINES'
    GovtJobPipeline via each yielded item's 'job_id' key). Run either
    manually via `scrapy crawl generic_govtjob -a source_portal=...`, or
    automatically by the Celery `scrape_portal` task, which passes
    `start_url`/`source_portal` sourced from a `ScraperSource` DB row
    (apps.tenders.models.ScraperSource) with source_type='govt_job'.
    """
    name = 'generic_govtjob'

    custom_settings = {
        'DOWNLOAD_DELAY': 3,
        'RANDOMIZE_DOWNLOAD_DELAY': True,
    }

    def __init__(self, start_url=None, source_portal=None, *args, **kwargs):
        """
        Constructed by Scrapy when the spider is launched (CLI `-a` args or
        the Celery task's crawler-process kwargs supply start_url/source_portal).
        If start_url isn't provided (e.g. run bare via `scrapy crawl
        generic_govtjob` with no args), falls back to looking up the first
        active ScraperSource row configured to use this spider, so the spider
        is still runnable standalone for debugging. Sets self.start_urls (the
        Scrapy convention Scrapy reads to seed the crawl) and
        self.source_portal_key (derived from the URL's domain if no explicit
        source_portal was given) used to tag every scraped item.
        """
        super().__init__(*args, **kwargs)
        if not start_url:
            from apps.tenders.models import ScraperSource
            source = ScraperSource.objects.filter(
                source_type='govt_job', is_active=True, spider_name='generic_govtjob'
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
        engine for each request whose callback wasn't overridden. Tries the
        table-based extraction strategy first, then the link-list strategy;
        for each item found, either follows its detail-page link (yielding a
        new Request with _parse_detail as the callback) or yields the item
        directly if there's no detail link. Also yields a follow-up Request
        for the next listing page, if one is found. Yields Items and/or
        Requests (Scrapy dispatches each based on type).
        """
        items = (
            self._parse_as_table(response) or
            self._parse_as_list(response) or
            []
        )

        if not items:
            logger.warning(
                f"[{self.source_portal_key}] No job notifications found on {response.url}. "
                "The portal may use JavaScript or have a unique structure."
            )
            return

        for item in items:
            detail_url = item.pop('_detail_url', None)
            if detail_url:
                yield response.follow(
                    detail_url,
                    callback=self._parse_detail,
                    cb_kwargs={'item': item},
                    errback=self._errback,
                )
            else:
                yield item

        logger.info(f"[{self.source_portal_key}] Found {len(items)} job notifications on {response.url}")

        next_url = self._find_next_page(response)
        if next_url:
            yield response.follow(next_url, callback=self.parse, errback=self._errback)

    # ------------------------------------------------------------------ #
    #  Strategy 1 — table rows                                             #
    # ------------------------------------------------------------------ #

    def _parse_as_table(self, response):
        """
        Strategy 1: try to find job notifications laid out as HTML table rows.
        Called by parse() before falling back to the link-list strategy.
        Tries a few selectors from most-specific to most-generic and stops at
        the first one that yields at least 2 data rows (a single hit is more
        likely a stray/non-listing table). Returns a list of item dicts, or
        None if no selector found a plausible table.
        """
        for selector in [
            'table tr',              # any table on the page (broad first pass)
            'table.table tr',        # Bootstrap-style tables, common on govt CMS themes
            '#content table tr',     # table scoped to the main content area, to skip layout/nav tables
        ]:
            rows = [r for r in response.css(selector) if r.css('td')]  # keep only rows with data cells (skip header-only <tr> with just <th>)
            if len(rows) >= 2:
                items = []
                for row in rows:
                    item = self._row_to_item(row, response)
                    if item:
                        items.append(item)
                if items:
                    return items
        return None

    def _row_to_item(self, row, response):
        """
        Convert a single <tr> table row into a job item dict, or None if the
        row doesn't look like a real job notification (too few cells, or no
        cell text long/plausible enough to be a title). Called by
        _parse_as_table() for each candidate row.
        """
        cells = row.css('td')
        if len(cells) < 2:
            return None
        texts = [_clean(' '.join(c.css('::text').getall())) for c in cells]
        # Pick the first cell that's long enough to plausibly be a job title and
        # doesn't look like a nav/menu label (see _is_nav_title heuristics above)
        title = next((t for t in texts if len(t) > 15 and not _is_nav_title(t)), None)
        if not title:
            return None
        link = row.css('a::attr(href)').get()  # first link anywhere in the row — usually the detail-page link
        # Derive a job_id from the link or from title hash
        job_id = re.sub(r'\W+', '-', (link or title)[:80]).strip('-')
        # Find date-like strings for deadline
        deadline = next((t for t in texts if DATE_PATTERN.search(t)), None)
        return {
            'source_portal':    self.source_portal_key,
            'job_id':           job_id,
            'title':            title,
            'organisation':     '',
            'state':            '',
            'category':         'other',
            'qualification':    '',
            'vacancy_count':    None,
            'age_limit':        '',
            'salary_range':     '',
            'application_start':    None,
            'application_deadline': deadline,
            'exam_date':        None,
            'source_url':       response.urljoin(link) if link else response.url,
            'notification_pdf_url': '',
            'published_at':     None,
            '_detail_url':      link,
        }

    # ------------------------------------------------------------------ #
    #  Strategy 2 — list/article items                                     #
    # ------------------------------------------------------------------ #

    def _parse_as_list(self, response):
        """
        Strategy 2: try to find job notifications laid out as a list of
        anchor links (news/notification feed style, rather than a table).
        Called by parse() only when _parse_as_table() found nothing. Tries
        selectors from generic list markup to CMS-specific content
        containers, stopping at the first selector with at least 3 candidate
        links (fewer than that is more likely a nav menu). Returns a list of
        item dicts, or None if no selector yielded anything.
        """
        items = []
        for selector in [
            'ul li a', 'ol li a',                                  # generic bullet/numbered list links
            '.notification-list a', '.recruitment-list a',         # common CMS class names for notice feeds
            '.content-area a', 'article a', '.post a',              # fallback: any link inside a main-content/article/post container
        ]:
            links = response.css(selector)
            if len(links) >= 3:
                for link in links:
                    title = _clean(link.css('::text').get(''))
                    href  = link.attrib.get('href', '')
                    if not title or not href:
                        continue
                    if _is_nav_title(title):
                        continue
                    job_id = re.sub(r'\W+', '-', href[:80]).strip('-')
                    items.append({
                        'source_portal':    self.source_portal_key,
                        'job_id':           job_id,
                        'title':            title,
                        'organisation':     '',
                        'state':            '',
                        'category':         'other',
                        'qualification':    '',
                        'vacancy_count':    None,
                        'age_limit':        '',
                        'salary_range':     '',
                        'application_start':    None,
                        'application_deadline': None,
                        'exam_date':        None,
                        'source_url':       response.urljoin(href),
                        'notification_pdf_url': '',
                        'published_at':     None,
                        '_detail_url':      href,
                    })
                if items:
                    return items
        return None

    # ------------------------------------------------------------------ #
    #  Detail page                                                          #
    # ------------------------------------------------------------------ #

    def _parse_detail(self, response, item):
        """
        Callback for the job's detail page, invoked via response.follow() from
        parse() when a row/link had a detail URL. Enriches the partial item
        (built from the listing page) with fields only available on the
        detail page — organisation, vacancy count, age limit, salary,
        qualification, key dates, category, state, and the notification PDF
        link — then yields the completed item dict for the pipelines to save.
        `item` is passed in via cb_kwargs from parse().
        """
        def find_label(labels):
            # Generic "label: value" table extractor used by NIC/CMS-style detail pages:
            # find a <td> whose (case-insensitized via XPath translate()) text contains
            # one of the given label strings, then read the text of the very next <td>
            # sibling — that's the value cell. Tries each label in turn since portals
            # phrase the same field differently (e.g. "Age Limit" vs "Maximum Age").
            for label in labels:
                val = response.xpath(
                    f'//td[contains(translate(., "ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"),"{label.lower()}")]/following-sibling::td[1]/text()'
                ).get()
                if val:
                    return _clean(val)
            return None

        # Try to extract PDF notification link: prefer a direct .pdf href, else fall
        # back to an anchor whose visible text says "Notification" or "Advertisement"
        # (some portals link to a PDF through a redirect/viewer URL, not a raw .pdf)
        pdf = (
            response.css('a[href$=".pdf"]::attr(href)').get() or
            response.css('a:contains("Notification")::attr(href)').get() or
            response.css('a:contains("Advertisement")::attr(href)').get() or
            ''
        )

        # Each call below tries several label spellings/synonyms seen across different
        # portals for the same logical field (see find_label() docs above).
        organisation = find_label(['organisation', 'organization', 'department', 'board', 'commission'])
        vacancy      = find_label(['vacancy', 'vacancies', 'posts', 'no. of post'])
        age          = find_label(['age limit', 'age', 'maximum age'])
        salary       = find_label(['pay scale', 'salary', 'pay band', 'grade pay', 'ctc'])
        qual         = find_label(['qualification', 'educational', 'eligibility'])
        deadline     = find_label(['last date', 'closing date', 'application deadline', 'apply before'])
        exam_date    = find_label(['exam date', 'examination date', 'written test'])
        start_date   = find_label(['start date', 'opening date', 'application start'])
        category     = self._detect_category(item['title'])
        state        = find_label(['state', 'location'])

        # Merge detail-page findings into the item, preferring detail-page values but
        # falling back to whatever the listing page already had (e.g. application_deadline
        # may have been scraped from the listing row already).
        item.update({
            'organisation':         organisation or item.get('organisation', ''),
            'state':                state or item.get('state', ''),
            'category':             category,
            'qualification':        qual or '',
            'vacancy_count':        _parse_int(vacancy),
            'age_limit':            age or '',
            'salary_range':         salary or '',
            'application_start':    start_date,
            'application_deadline': deadline or item.get('application_deadline'),
            'exam_date':            exam_date,
            'notification_pdf_url': response.urljoin(pdf) if pdf else '',
        })
        yield item

    # ------------------------------------------------------------------ #
    #  Helpers                                                              #
    # ------------------------------------------------------------------ #

    def _detect_category(self, title):
        """
        Classify a job title into a coarse category bucket by keyword
        matching (civil services, banking, railway, police, teaching,
        healthcare, PSU, or 'other'). Called by _parse_detail() to populate
        the item's `category` field, since portals rarely expose a structured
        category themselves. Order matters — first matching bucket wins.
        """
        title_lower = title.lower()
        if any(k in title_lower for k in ['upsc', 'ias', 'ips', 'civil service', 'mpsc', 'spsc']):
            return 'civil_services'
        if any(k in title_lower for k in ['bank', 'ibps', 'sbi', 'rbi', 'nabard']):
            return 'banking'
        if any(k in title_lower for k in ['railway', 'rrb', 'rlwl', 'loco pilot']):
            return 'railway'
        if any(k in title_lower for k in ['police', 'constable', 'defence', 'army', 'navy', 'air force', 'crpf', 'bsf']):
            return 'police'
        if any(k in title_lower for k in ['teacher', 'lecturer', 'professor', 'tet', 'ctet', 'school', 'college']):
            return 'teaching'
        if any(k in title_lower for k in ['doctor', 'nurse', 'health', 'medical', 'hospital', 'aiims']):
            return 'healthcare'
        if any(k in title_lower for k in ['psu', 'ongc', 'bhel', 'bpcl', 'ntpc', 'sail', 'hpcl', 'oil']):
            return 'psu'
        if any(k in title_lower for k in ['ssc', 'cgl', 'chsl', 'mts', 'gd constable']):
            return 'other'
        return 'other'

    def _find_next_page(self, response):
        """
        Look for a "Next page" pagination link using several common label/class
        conventions. Called by parse() after processing the current page's
        items. Returns the href string of the first match, or None if no
        pagination control was found (i.e. this is the last page).
        """
        for selector in [
            'a:contains("Next")::attr(href)',   # link literally labelled "Next"
            'a:contains("next")::attr(href)',   # lowercase variant
            'a:contains(">>")::attr(href)',     # arrow-style pagination label
            'a.next::attr(href)',               # common CSS class for the next-page control
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

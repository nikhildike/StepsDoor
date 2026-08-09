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
    return ' '.join((text or '').split())


def _parse_int(text):
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
    Handles Indian government recruitment portals automatically.
    Tries multiple common HTML patterns for job notification listings.
    """
    name = 'generic_govtjob'

    custom_settings = {
        'DOWNLOAD_DELAY': 3,
        'RANDOMIZE_DOWNLOAD_DELAY': True,
    }

    def __init__(self, start_url=None, source_portal=None, *args, **kwargs):
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
        for selector in ['table tr', 'table.table tr', '#content table tr']:
            rows = [r for r in response.css(selector) if r.css('td')]
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
        cells = row.css('td')
        if len(cells) < 2:
            return None
        texts = [_clean(' '.join(c.css('::text').getall())) for c in cells]
        title = next((t for t in texts if len(t) > 15 and not _is_nav_title(t)), None)
        if not title:
            return None
        link = row.css('a::attr(href)').get()
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
        items = []
        for selector in [
            'ul li a', 'ol li a',
            '.notification-list a', '.recruitment-list a',
            '.content-area a', 'article a', '.post a',
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
        def find_label(labels):
            for label in labels:
                val = response.xpath(
                    f'//td[contains(translate(., "ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"),"{label.lower()}")]/following-sibling::td[1]/text()'
                ).get()
                if val:
                    return _clean(val)
            return None

        # Try to extract PDF notification link
        pdf = (
            response.css('a[href$=".pdf"]::attr(href)').get() or
            response.css('a:contains("Notification")::attr(href)').get() or
            response.css('a:contains("Advertisement")::attr(href)').get() or
            ''
        )

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
        for selector in [
            'a:contains("Next")::attr(href)',
            'a:contains("next")::attr(href)',
            'a:contains(">>")::attr(href)',
            'a.next::attr(href)',
            'li.next a::attr(href)',
        ]:
            href = response.css(selector).get()
            if href:
                return href
        return None

    def _errback(self, failure):
        logger.warning(f"[{self.source_portal_key}] Request failed: {failure.request.url} — {failure.value}")

"""Applicant-tracking-system (ATS) detection for private companies' careers pages.

Most large employers don't build their careers page themselves; they embed or
redirect to an ATS (Greenhouse, Lever, Workday, Darwinbox, ...). Several ATSs
expose a public JSON feed, so one adapter per ATS can cover many companies.
This module answers "which ATS does this careers URL use?" so we know which
adapters are worth writing before building any private-job spider.

Used by the `classify_careers_ats` management command. Detection is split into
pure functions (`detect_ats_in_url`, `detect_ats_in_html`, `count_jsonld_jobs`,
`looks_like_js_shell`) that tests can feed saved pages, and network helpers
(`PoliteFetcher`, `classify`) that obey robots.txt and throttle per host.

This is private-company data only — nothing here reads or writes govt jobs.
"""
import json
import re
import threading
import time
import urllib.robotparser
from dataclasses import dataclass
from urllib.parse import urlsplit

import requests

# Honest, identifiable bot UA. Private sites get no rotating browser UA
# (unlike the govt scrapers' RandomUserAgentMiddleware): if a company blocks
# this UA we respect it and skip the company.
USER_AGENT = 'StepsDoorBot/1.0 (+https://stepsdoor.in/bot; careers-page classifier)'

# Minimum seconds between two requests to the same host (shared ATS hosts such
# as api.lever.co serve many companies, so this matters there most).
MIN_HOST_INTERVAL = 1.0


@dataclass(frozen=True)
class AtsPattern:
    """One ATS signature: a regex over URLs and which group holds the company slug."""
    name: str  # Short ATS id written to the output CSV (e.g. 'greenhouse')
    regex: re.Pattern  # Matches the ATS's hostnames/paths inside a URL or raw HTML
    has_public_api: bool = False  # True when the ATS has a documented public jobs JSON feed


def _p(name, pattern, api=False):
    """Build an `AtsPattern` with a case-insensitive regex (keeps the table below short)."""
    return AtsPattern(name, re.compile(pattern, re.I), api)


# Ordered most-specific first. Group 1 (when present) is the company slug the
# ATS uses in its public URLs/API; for Workday it's "tenant/site".
ATS_PATTERNS = [
    _p('greenhouse', r'(?:boards|job-boards)(?:\.eu)?\.greenhouse\.io/(?:embed/job_board\?for=)?([A-Za-z0-9_-]+)', api=True),
    _p('greenhouse', r'boards-api\.greenhouse\.io/v1/boards/([A-Za-z0-9_-]+)', api=True),
    _p('greenhouse', r'greenhouse\.io/embed/job_board(?:/js)?\?for=([A-Za-z0-9_-]+)', api=True),
    _p('lever', r'(?:jobs|api)\.(?:eu\.)?lever\.co/(?:v0/postings/)?([A-Za-z0-9_.-]+)', api=True),
    _p('smartrecruiters', r'(?:careers|jobs)\.smartrecruiters\.com/([A-Za-z0-9_-]+)', api=True),
    _p('smartrecruiters', r'api\.smartrecruiters\.com/v1/companies/([A-Za-z0-9_-]+)', api=True),
    _p('ashby', r'jobs\.ashbyhq\.com/([A-Za-z0-9_.-]+)', api=True),
    _p('workable', r'apply\.workable\.com/([A-Za-z0-9_-]+)', api=True),
    _p('recruitee', r'([A-Za-z0-9-]+)\.recruitee\.com', api=True),
    # Workday's JSON is what its own page calls — usable but unofficial.
    _p('workday', r'([A-Za-z0-9-]+\.wd\d+\.myworkdayjobs\.com/(?:[a-z]{2}-[A-Z]{2}/)?[A-Za-z0-9_-]+)'),
    _p('workday', r'([A-Za-z0-9-]+)\.myworkdaysite\.com'),
    _p('successfactors', r'([A-Za-z0-9.-]*successfactors\.(?:com|eu)|jobs\.sap\.com|career\d*\.sapsf\.[a-z]+)'),
    _p('oracle_hcm', r'([A-Za-z0-9-]+)\.[A-Za-z0-9.-]*oraclecloud\.com/hcmUI/CandidateExperience'),
    _p('taleo', r'([A-Za-z0-9-]+)\.taleo\.net'),
    _p('icims', r'([A-Za-z0-9-]+)\.icims\.com'),
    _p('jobvite', r'jobs\.jobvite\.com/([A-Za-z0-9_-]+)'),
    _p('eightfold', r'([A-Za-z0-9-]+)\.eightfold\.ai'),
    _p('avature', r'([A-Za-z0-9-]+)\.avature\.net'),
    _p('phenom', r'(cdn\.phenompeople\.com|phenom(?:people)?\.com/[A-Za-z0-9_/-]*)'),
    _p('teamtailor', r'([A-Za-z0-9-]+)\.teamtailor\.com'),
    # ATSs common with Indian employers.
    _p('darwinbox', r'([A-Za-z0-9-]+)\.darwinbox\.(?:in|com)'),
    _p('keka', r'([A-Za-z0-9-]+)\.keka\.com/careers'),
    _p('zoho_recruit', r'([A-Za-z0-9-]+)\.zohorecruit\.(?:com|in|eu)'),
    _p('freshteam', r'([A-Za-z0-9-]+)\.freshteam\.com'),
]

# Slugs that the loose patterns above can capture but that aren't companies
# (asset paths, script names, generic hosts).
_NOT_A_SLUG = {'embed', 'js', 'v0', 'v1', 'www', 'api', 'cdn', 'static', 'assets', 'jobs', 'careers', 'app'}

_JSONLD_RE = re.compile(
    r'<script[^>]+type=["\']application/ld\+json["\'][^>]*>(.*?)</script>', re.I | re.S)
_SCRIPT_STYLE_RE = re.compile(r'<(script|style|noscript)\b.*?</\1>', re.I | re.S)
_TAG_RE = re.compile(r'<[^>]+>')


def detect_ats_in_url(url):
    """Return `(ats, slug)` if `url` itself is hosted on a known ATS, else `(None, None)`.

    Used on the page's final URL after redirects — the strongest signal,
    e.g. `https://careers.example.com` redirecting to `jobs.lever.co/example`.
    """
    return _first_match(url or '')


def detect_ats_in_html(html):
    """Return `(ats, slug, evidence)` for the first ATS referenced in a page's HTML.

    Catches embedded boards (iframes, `<script src>`, "Apply" links) on a
    careers page that lives on the company's own domain. `evidence` is the
    matched snippet, written to the CSV so a human can double-check.
    Returns `(None, None, '')` when no ATS is referenced.
    """
    for pat in ATS_PATTERNS:  # priority order: specific public-API ATSs before loose host patterns
        for m in pat.regex.finditer(html or ''):
            slug = _clean_slug(m)
            if pat.regex.groups and slug is None:
                continue  # matched a generic asset path, not a company board
            return pat.name, slug, m.group(0)[:120]
    return None, None, ''


def _first_match(text):
    """Return `(ats, slug)` for the first pattern (in priority order) that matches `text`."""
    for pat in ATS_PATTERNS:
        m = pat.regex.search(text)
        if m and (not pat.regex.groups or _clean_slug(m) is not None):
            return pat.name, _clean_slug(m)
    return None, None


def _clean_slug(match):
    """Return the company slug from a pattern match, or None if it's a generic path segment."""
    if not match.re.groups:
        return ''
    slug = (match.group(1) or '').strip('/')
    if not slug or slug.lower() in _NOT_A_SLUG:
        return None
    return slug


def count_jsonld_jobs(html):
    """Count schema.org `JobPosting` objects embedded as JSON-LD in `html`.

    Companies that want to appear in Google for Jobs embed these, and one
    generic extractor can read them on any site. Handles a single object, a
    top-level list, and `@graph` containers; malformed blocks are skipped.
    """
    total = 0
    for raw in _JSONLD_RE.findall(html or ''):
        try:
            data = json.loads(raw.strip())
        except ValueError:
            continue  # invalid JSON-LD is common (trailing commas, HTML entities)
        total += sum(1 for node in _walk_jsonld(data) if _is_job_posting(node))
    return total


def _walk_jsonld(data):
    """Yield every dict in a JSON-LD structure (lists, `@graph`, ItemList elements)."""
    if isinstance(data, list):
        for item in data:
            yield from _walk_jsonld(item)
    elif isinstance(data, dict):
        yield data
        for key in ('@graph', 'itemListElement', 'item'):
            if key in data:
                yield from _walk_jsonld(data[key])


def _is_job_posting(node):
    """True when a JSON-LD node's `@type` is (or includes) `JobPosting`."""
    t = node.get('@type')
    return t == 'JobPosting' or (isinstance(t, list) and 'JobPosting' in t)


def looks_like_js_shell(html):
    """Guess whether a page is an empty JavaScript app shell (jobs load client-side).

    Such pages need the browser's Network tab to find the JSON the page calls
    (or Playwright as a last resort), so they're reported separately from
    plain custom HTML pages. Heuristic: under 400 characters of visible text.
    """
    text = _TAG_RE.sub(' ', _SCRIPT_STYLE_RE.sub(' ', html or ''))
    return len(' '.join(text.split())) < 400


class PoliteFetcher:
    """Thread-safe HTTP client that obeys robots.txt and spaces requests per host.

    One instance is shared by all worker threads of a classifier run, so the
    robots.txt cache and per-host timers are global for that run.
    """

    def __init__(self, timeout=20, min_interval=MIN_HOST_INTERVAL):
        """`timeout`: seconds per request; `min_interval`: seconds between hits on one host."""
        self.timeout = timeout
        self.min_interval = min_interval
        self._local = threading.local()  # one requests.Session per thread (Session isn't thread-safe)
        self._robots = {}  # origin -> RobotFileParser (or None when robots.txt couldn't be read)
        self._robots_lock = threading.Lock()
        self._blocked = set()  # origins that refused robots.txt itself with 401/403 (bot walls)
        self._host_next = {}  # host -> earliest monotonic time the next request may start
        self._host_lock = threading.Lock()

    @property
    def session(self):
        """This thread's `requests.Session`, created on first use with the bot UA."""
        if not hasattr(self._local, 'session'):
            s = requests.Session()
            s.headers.update({'User-Agent': USER_AGENT, 'Accept-Language': 'en-IN,en;q=0.8'})
            self._local.session = s
        return self._local.session

    def allowed(self, url):
        """True if the site's robots.txt lets `USER_AGENT` fetch `url`.

        A missing robots.txt (404) allows everything; 401/403 on robots.txt
        disallows everything (standard robots convention) and marks the site
        as `blocked` (usually a CDN bot wall, see `is_blocked`); network errors
        on robots.txt allow, since the page fetch itself will then fail or succeed.
        """
        origin = _origin(url)
        with self._robots_lock:
            if origin not in self._robots:
                self._robots[origin] = self._load_robots(origin)
            rp = self._robots[origin]
        return True if rp is None else rp.can_fetch(USER_AGENT, url)

    def _load_robots(self, origin):
        """Fetch and parse `<origin>/robots.txt`; returns a parser or None (= allow all)."""
        rp = urllib.robotparser.RobotFileParser()
        try:
            resp = self._get_raw(origin + '/robots.txt')
        except requests.RequestException:
            return None
        if resp.status_code in (401, 403):
            rp.disallow_all = True
            self._blocked.add(origin)
        elif resp.status_code >= 400:
            rp.allow_all = True
        else:
            rp.parse(resp.text.splitlines())
        return rp

    def is_blocked(self, url):
        """True if `url`'s site refused our robots.txt request (401/403) — a bot wall, not a robots rule.

        Lets the classifier report `blocked` separately from a genuine
        robots.txt `Disallow`; both mean "skip this company".
        """
        return _origin(url) in self._blocked

    def get(self, url, **kwargs):
        """GET `url` if robots.txt allows it; returns the Response, or None if disallowed."""
        if not self.allowed(url):
            return None
        return self._get_raw(url, **kwargs)

    def post_json(self, url, payload):
        """POST `payload` as JSON if robots.txt allows `url`; returns the Response, or None if disallowed.

        Needed for Workday, whose careers page searches jobs with a JSON POST
        (`/wday/cxs/<tenant>/<site>/jobs`); same robots and host spacing as `get`.
        """
        if not self.allowed(url):
            return None
        self._wait_for_host(urlsplit(url).netloc.lower())
        return self.session.post(url, json=payload, timeout=self.timeout, headers={'Accept': 'application/json'})

    def _get_raw(self, url, **kwargs):
        """GET without the robots check, after waiting out the host's politeness interval."""
        self._wait_for_host(urlsplit(url).netloc.lower())
        return self.session.get(url, timeout=self.timeout, allow_redirects=True, **kwargs)

    def _wait_for_host(self, host):
        """Block until `min_interval` has passed since the last request to `host`."""
        with self._host_lock:
            now = time.monotonic()
            start = max(now, self._host_next.get(host, 0.0))
            self._host_next[host] = start + self.min_interval
        if start > now:
            time.sleep(start - now)


def _origin(url):
    """Return `scheme://host[:port]` for `url` (the key robots.txt rules apply to)."""
    parts = urlsplit(url)
    return f'{parts.scheme}://{parts.netloc}'


@dataclass
class Classification:
    """Result of classifying one company's careers page — one row of the output CSV."""
    name: str  # Company display name from the directory
    sector: str  # Directory sector (e.g. 'IT & Software')
    careers_url: str  # Careers URL as listed in the directory
    final_url: str = ''  # URL after redirects ('' if the page wasn't fetched)
    ats: str = ''  # Detected ATS id, 'jsonld', 'custom', 'js_shell', or '' when unknown
    ats_slug: str = ''  # Company id inside the ATS (used by a future adapter), if known
    public_api: bool = False  # True when the ATS has a public jobs feed we can adapt
    jsonld_jobs: int = 0  # JobPosting objects found in the careers page's JSON-LD
    api_jobs: str = ''  # Job count from the ATS's public API ('' when not checked/failed)
    status: str = ''  # 'ok', 'robots_disallowed', 'blocked' (bot wall), 'http_<code>', or 'error'
    evidence: str = ''  # Snippet/URL that triggered the ATS match, for manual review
    note: str = ''  # Error text or other remarks


# Public "list open jobs" endpoints, used to confirm a detected slug really is
# a live board and to size how many jobs each adapter would bring in.
_API_COUNTERS = {
    'greenhouse': ('https://boards-api.greenhouse.io/v1/boards/{slug}/jobs', lambda d: len(d.get('jobs', []))),
    'lever': ('https://api.lever.co/v0/postings/{slug}?mode=json', lambda d: len(d) if isinstance(d, list) else 0),
    'smartrecruiters': ('https://api.smartrecruiters.com/v1/companies/{slug}/postings?limit=1',
                        lambda d: int(d.get('totalFound', 0))),
    'ashby': ('https://api.ashbyhq.com/posting-api/job-board/{slug}', lambda d: len(d.get('jobs', []))),
    'workable': ('https://apply.workable.com/api/v1/widget/accounts/{slug}', lambda d: len(d.get('jobs', []))),
    'recruitee': ('https://{slug}.recruitee.com/api/offers/', lambda d: len(d.get('offers', []))),
}


def api_job_count(fetcher, ats, slug):
    """Return the number of open jobs on `slug`'s public ATS feed, or None if unavailable.

    Only called for ATSs in `_API_COUNTERS`; failures (404 = wrong slug,
    timeouts, robots disallow) return None rather than raising.
    """
    if ats not in _API_COUNTERS or not slug:
        return None
    url_tpl, count = _API_COUNTERS[ats]
    try:
        resp = fetcher.get(url_tpl.format(slug=slug), headers={'Accept': 'application/json'})
        if resp is None or resp.status_code != 200:
            return None
        return count(resp.json())
    except (requests.RequestException, ValueError, TypeError, AttributeError):
        return None


def classify(fetcher, name, url, sector='', check_api=True):
    """Classify one company's careers page and return a `Classification`.

    Order of evidence: ATS in the URL as listed → ATS in the final URL after
    redirects → ATS referenced in the page HTML → JSON-LD JobPostings → JS
    shell vs plain custom page. With `check_api`, ATSs that have a public
    feed are confirmed by counting their open jobs.
    """
    result = Classification(name=name, sector=sector, careers_url=url)
    ats, slug = detect_ats_in_url(url)
    evidence = url if ats else ''
    html = ''
    try:
        resp = fetcher.get(url)
        if resp is None:
            result.status = 'blocked' if fetcher.is_blocked(url) else 'robots_disallowed'
        else:
            result.final_url = resp.url
            result.status = 'ok' if resp.status_code < 400 else f'http_{resp.status_code}'
            html = resp.text if resp.status_code < 400 else ''
    except requests.RequestException as exc:
        result.status = 'error'
        result.note = f'{type(exc).__name__}: {exc}'[:200]

    if not ats and result.final_url:
        ats, slug = detect_ats_in_url(result.final_url)
        evidence = result.final_url if ats else ''
    if not ats and html:
        ats, slug, evidence = detect_ats_in_html(html)
    if html:
        result.jsonld_jobs = count_jsonld_jobs(html)

    if ats:
        result.ats, result.ats_slug, result.evidence = ats, slug or '', evidence
        result.public_api = next(p.has_public_api for p in ATS_PATTERNS if p.name == ats)
        if check_api and result.public_api:
            n = api_job_count(fetcher, ats, slug)
            result.api_jobs = '' if n is None else str(n)
    elif result.jsonld_jobs:
        result.ats = 'jsonld'
    elif html:
        result.ats = 'js_shell' if looks_like_js_shell(html) else 'custom'
    return result

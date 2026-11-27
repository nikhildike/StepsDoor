"""Classify private companies' careers pages by applicant-tracking system (ATS).

Step 1 of private-job scraping: before building any spider, find out which
ATS each company uses (Greenhouse, Lever, Workday, Darwinbox, ...), which have
JSON-LD JobPostings, and which are custom pages, so adapters are built in
order of how many companies they cover. It only reads public pages (obeying
robots.txt, about one request per second per host) and writes a CSV; it
changes nothing in the database and never touches govt jobs.

Input defaults to the web app's static company career directory
(`frontend/src/pages/public/Companies.jsx`, `COMPANY_DIRECTORY`). A CSV with
`name,url[,sector]` columns also works.

    python manage.py classify_careers_ats --output careers_ats.csv
    python manage.py classify_careers_ats --input companies.csv --limit 20 --no-api
"""
import csv
import re
from collections import Counter
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import asdict, fields
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from apps.careers.ats import Classification, PoliteFetcher, classify

# Default input: the web app's static directory (mirrored in mobile/src/data/companyDirectory.ts).
DEFAULT_INPUT = Path(settings.BASE_DIR).parent / 'frontend' / 'src' / 'pages' / 'public' / 'Companies.jsx'

# One `{ name: '...', url: '...', desc: '...', sector: '...' }` entry in
# COMPANY_DIRECTORY. Strings are single-quoted JS, possibly with \' escapes.
_JS_STR = r"'((?:[^'\\]|\\.)*)'"
_ENTRY_RE = re.compile(r'\{\s*name:\s*' + _JS_STR + r'\s*,\s*url:\s*' + _JS_STR + r'[^}]*?sector:\s*' + _JS_STR)


def load_companies(path):
    """Return `[(name, url, sector), ...]` from a CSV or a JS/TS directory file, de-duplicated by URL.

    CSV needs a header with `name` and `url` (and optionally `sector`).
    Any other extension is parsed as the JS `COMPANY_DIRECTORY` literal.
    """
    path = Path(path)
    if not path.exists():
        raise CommandError(f'Input not found: {path}')
    if path.suffix.lower() == '.csv':
        with path.open(newline='', encoding='utf-8-sig') as fh:
            rows = [(r.get('name', '').strip(), r.get('url', '').strip(), (r.get('sector') or '').strip())
                    for r in csv.DictReader(fh)]
    else:
        text = path.read_text(encoding='utf-8')
        unescape = lambda s: s.replace("\\'", "'")  # JS single-quote escapes
        rows = [(unescape(n), u, unescape(s)) for n, u, s in _ENTRY_RE.findall(text)]

    seen, companies = set(), []
    for name, url, sector in rows:
        if not url.startswith(('http://', 'https://')) or url in seen:
            continue  # skip blank/relative URLs and companies listed twice
        seen.add(url)
        companies.append((name, url, sector))
    if not companies:
        raise CommandError(f'No companies with URLs found in {path}')
    return companies


class Command(BaseCommand):
    """`classify_careers_ats`: write one CSV row per company with its detected ATS."""

    help = 'Detect which ATS (Greenhouse, Lever, Workday, ...) each private company careers page uses.'

    def add_arguments(self, parser):
        """Register CLI options (input/output paths, limits, concurrency, API check)."""
        parser.add_argument('--input', default=str(DEFAULT_INPUT),
                            help='CSV (name,url[,sector]) or JS directory file. Default: web Companies.jsx')
        parser.add_argument('--output', default='careers_ats.csv', help='CSV to write (default: careers_ats.csv)')
        parser.add_argument('--limit', type=int, default=0, help='Only classify the first N companies')
        parser.add_argument('--workers', type=int, default=6,
                            help='Parallel companies (each host is still limited to ~1 request/second)')
        parser.add_argument('--timeout', type=int, default=20, help='Seconds per HTTP request')
        parser.add_argument('--no-api', action='store_true',
                            help="Don't confirm detected boards against the ATS's public jobs API")

    def handle(self, *args, **opts):
        """Classify every company concurrently, write the CSV, and print a per-ATS summary."""
        companies = load_companies(opts['input'])
        if opts['limit']:
            companies = companies[:opts['limit']]
        self.stdout.write(f'Classifying {len(companies)} careers pages...')

        fetcher = PoliteFetcher(timeout=opts['timeout'])
        results = []
        with ThreadPoolExecutor(max_workers=max(1, opts['workers'])) as pool:
            futures = [pool.submit(classify, fetcher, n, u, s, not opts['no_api']) for n, u, s in companies]
            for i, fut in enumerate(as_completed(futures), 1):
                try:
                    results.append(fut.result())
                except Exception as exc:  # one bad page must not lose the whole run
                    self.stderr.write(f'  unexpected error: {exc!r}')
                if i % 25 == 0:
                    self.stdout.write(f'  {i}/{len(companies)} done')

        order = {u: i for i, (_, u, _) in enumerate(companies)}
        results.sort(key=lambda r: order[r.careers_url])  # keep the input order in the CSV
        self._write_csv(opts['output'], results)
        self._summarise(results, opts['output'])

    def _write_csv(self, path, results):
        """Write `results` to `path` with one column per `Classification` field."""
        columns = [f.name for f in fields(Classification)]
        with open(path, 'w', newline='', encoding='utf-8') as fh:
            writer = csv.DictWriter(fh, fieldnames=columns)
            writer.writeheader()
            for r in results:
                writer.writerow(asdict(r))

    def _summarise(self, results, path):
        """Print counts per ATS and per fetch status (ASCII only — Windows consoles are cp1252)."""
        by_ats = Counter(r.ats or 'unknown' for r in results)
        jobs = Counter()
        for r in results:
            if r.api_jobs:
                jobs[r.ats] += int(r.api_jobs)
        self.stdout.write('\nCompanies per platform:')
        for ats, n in by_ats.most_common():
            extra = f'  ({jobs[ats]} open jobs via public API)' if jobs[ats] else ''
            self.stdout.write(f'  {ats:<16} {n:>4}{extra}')
        self.stdout.write('\nFetch status:')
        for status, n in Counter(r.status for r in results).most_common():
            self.stdout.write(f'  {status:<20} {n:>4}')
        self.stdout.write(self.style.SUCCESS(f'\nWrote {len(results)} rows to {path}'))

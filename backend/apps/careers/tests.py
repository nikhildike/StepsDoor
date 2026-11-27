"""Tests for the careers-page ATS classifier (`apps.careers.ats` and its command).

Detection functions are pure, so they're fed small HTML snippets; the network
path is exercised with a fake fetcher, so no test makes a real HTTP call.
"""
import tempfile
from pathlib import Path
from types import SimpleNamespace

from django.test import SimpleTestCase

from apps.careers.ats import (
    classify, count_jsonld_jobs, detect_ats_in_html, detect_ats_in_url, looks_like_js_shell,
)
from apps.careers.management.commands.classify_careers_ats import DEFAULT_INPUT, load_companies


class DetectAtsInUrlTests(SimpleTestCase):
    """ATS detection from a careers URL (as listed or after redirects)."""

    def test_known_hosts(self):
        """Each common ATS host yields the right ATS id and company slug."""
        cases = {
            'https://boards.greenhouse.io/razorpaysoftwareprivatelimited': ('greenhouse', 'razorpaysoftwareprivatelimited'),
            'https://job-boards.greenhouse.io/phonepe/jobs/123': ('greenhouse', 'phonepe'),
            'https://jobs.lever.co/cred': ('lever', 'cred'),
            'https://careers.smartrecruiters.com/Bosch': ('smartrecruiters', 'Bosch'),
            'https://hdfc.wd3.myworkdayjobs.com/en-US/HDFC_Careers': ('workday', 'hdfc.wd3.myworkdayjobs.com/en-US/HDFC_Careers'),
            'https://acme.darwinbox.in/ms/candidate/careers': ('darwinbox', 'acme'),
            'https://acme.keka.com/careers/': ('keka', 'acme'),
            'https://jobs.ashbyhq.com/zepto': ('ashby', 'zepto'),
        }
        for url, expected in cases.items():
            with self.subTest(url=url):
                self.assertEqual(detect_ats_in_url(url), expected)

    def test_company_domain_is_not_an_ats(self):
        """A careers page on the company's own domain isn't classified from the URL alone."""
        self.assertEqual(detect_ats_in_url('https://www.tcs.com/careers'), (None, None))


class DetectAtsInHtmlTests(SimpleTestCase):
    """ATS detection from references embedded in a careers page's HTML."""

    def test_greenhouse_embed_script(self):
        """The Greenhouse embed script's `for=` slug is picked up."""
        html = '<div id="grnhse_app"></div><script src="https://boards.greenhouse.io/embed/job_board/js?for=meesho"></script>'
        ats, slug, evidence = detect_ats_in_html(html)
        self.assertEqual((ats, slug), ('greenhouse', 'meesho'))
        self.assertIn('meesho', evidence)

    def test_lever_apply_link(self):
        """An "Apply" link to a Lever board identifies the ATS."""
        html = '<a href="https://jobs.lever.co/groww/abc-123">Apply</a>'
        self.assertEqual(detect_ats_in_html(html)[:2], ('lever', 'groww'))

    def test_public_api_ats_preferred_over_loose_patterns(self):
        """When a page mentions several ATSs, the higher-priority (public API) one wins."""
        html = ('<script src="https://cdn.phenompeople.com/x.js"></script>'
                '<a href="https://jobs.lever.co/acme">Jobs</a>')
        self.assertEqual(detect_ats_in_html(html)[0], 'lever')

    def test_no_ats(self):
        """A plain page with no ATS reference returns (None, None, '')."""
        self.assertEqual(detect_ats_in_html('<h1>Careers</h1><p>Email hr@example.com</p>'), (None, None, ''))


class JsonLdAndShellTests(SimpleTestCase):
    """JSON-LD JobPosting counting and JS-shell detection."""

    def test_counts_job_postings_in_list_and_graph(self):
        """JobPostings are counted in plain objects, lists and @graph; other types and bad JSON are ignored."""
        html = (
            '<script type="application/ld+json">{"@type": "JobPosting", "title": "A"}</script>'
            '<script type="application/ld+json">[{"@type": "JobPosting"}, {"@type": "Organization"}]</script>'
            '<script type="application/ld+json">{"@graph": [{"@type": ["JobPosting"]}]}</script>'
            '<script type="application/ld+json">{not json}</script>'
        )
        self.assertEqual(count_jsonld_jobs(html), 3)

    def test_js_shell(self):
        """An app shell with almost no visible text is flagged; a content page is not."""
        shell = '<html><body><div id="root"></div><script>' + 'x' * 5000 + '</script></body></html>'
        self.assertTrue(looks_like_js_shell(shell))
        self.assertFalse(looks_like_js_shell('<p>' + 'Open roles in Pune and Bengaluru. ' * 30 + '</p>'))


class FakeFetcher:
    """Stand-in for `PoliteFetcher`: maps URL -> (status, final_url, body); None = robots disallowed."""

    def __init__(self, pages):
        self.pages = pages

    def is_blocked(self, url):
        """The fake never simulates bot walls, only plain robots.txt disallows."""
        return False

    def get(self, url, **kwargs):
        """Return a minimal response object for `url`, or None if it's marked disallowed."""
        page = self.pages.get(url)
        if page is None:
            return None
        status, final_url, body = page
        json_body = body if not isinstance(body, str) else None
        return SimpleNamespace(status_code=status, url=final_url, text=body if isinstance(body, str) else '',
                               json=lambda: json_body)


class ClassifyTests(SimpleTestCase):
    """End-to-end `classify()` decisions with a fake fetcher."""

    def test_redirect_to_lever_confirmed_by_api(self):
        """A careers page redirecting to Lever is classified and its open jobs counted via the API."""
        fetcher = FakeFetcher({
            'https://acme.in/careers': (200, 'https://jobs.lever.co/acme', '<html>jobs</html>'),
            'https://api.lever.co/v0/postings/acme?mode=json': (200, '', [{'id': 1}, {'id': 2}]),
        })
        r = classify(fetcher, 'Acme', 'https://acme.in/careers')
        self.assertEqual((r.ats, r.ats_slug, r.public_api, r.api_jobs, r.status), ('lever', 'acme', True, '2', 'ok'))

    def test_jsonld_page(self):
        """A custom-domain page with JobPosting JSON-LD is classified as 'jsonld'."""
        body = '<script type="application/ld+json">{"@type": "JobPosting"}</script>' + '<p>text</p>' * 100
        r = classify(FakeFetcher({'https://b.in/jobs': (200, 'https://b.in/jobs', body)}), 'B', 'https://b.in/jobs')
        self.assertEqual((r.ats, r.jsonld_jobs), ('jsonld', 1))

    def test_robots_disallowed(self):
        """A page robots.txt forbids is reported as such and left unclassified."""
        r = classify(FakeFetcher({}), 'C', 'https://c.in/careers')
        self.assertEqual((r.status, r.ats), ('robots_disallowed', ''))


class LoadCompaniesTests(SimpleTestCase):
    """Input parsing for the classifier command."""

    def test_parses_real_web_directory(self):
        """The web app's COMPANY_DIRECTORY parses into hundreds of companies with http(s) URLs."""
        companies = load_companies(DEFAULT_INPUT)
        self.assertGreater(len(companies), 300)
        self.assertEqual(companies[0][:2], ('TCS', 'https://www.tcs.com/careers'))
        self.assertTrue(all(u.startswith('http') for _, u, _ in companies))

    def test_csv_input_dedupes_urls(self):
        """CSV input is read by header and duplicate URLs are dropped."""
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / 'c.csv'
            path.write_text('name,url,sector\nA,https://a.in/careers,IT\nA2,https://a.in/careers,IT\nB,,IT\n',
                            encoding='utf-8')
            self.assertEqual(load_companies(path), [('A', 'https://a.in/careers', 'IT')])

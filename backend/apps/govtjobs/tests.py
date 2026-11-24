"""
Tests for the dedicated govt-job spiders, run against real pages saved in test_fixtures/.

Each recruiter gets its own spider (the generic one produced mostly results and
admit cards), so each gets a parsing test here that pins the page structure it
relies on. When a recruiter redesigns its site, the live run logs FAILED and
the fix starts by saving the new page over the fixture.
"""
from pathlib import Path

from django.test import SimpleTestCase
from scrapy.http import HtmlResponse

from scrapers.pipelines import _parse_dt
from scrapers.spiders.upsc_spider import UpscSpider

FIXTURES = Path(__file__).parent / 'test_fixtures'


def fixture_response(name, url):
    """Wrap a saved HTML fixture in a Scrapy HtmlResponse as if downloaded from `url`."""
    return HtmlResponse(url=url, body=(FIXTURES / name).read_bytes(), encoding='utf-8')


class UpscSpiderTests(SimpleTestCase):
    """UPSC pages saved 24 Nov 2026."""

    def setUp(self):
        """Spider as run_source() launches it."""
        self.spider = UpscSpider(source_portal='upsc.gov.in')

    def test_exams_skip_rows_without_application_window(self):
        """Only exams with a last-date-to-apply become listings; 'NA' rows (Mains etc.) are skipped."""
        items = list(self.spider.parse_exams(
            fixture_response('upsc_active_examinations.html', 'https://upsc.gov.in/active-examinations/')
        ))
        self.assertTrue(items)
        titles = [i['title'] for i in items]
        self.assertIn('Engineering Services (Preliminary) Examination, 2027', titles)
        self.assertNotIn('Indian Forest Service (Main) Examination, 2026', titles)
        ese = next(i for i in items if i['title'].startswith('Engineering Services (Preliminary)'))
        self.assertEqual(ese['job_id'], 'exam:engineering-services-preliminary-examination-2027')
        self.assertEqual(_parse_dt(ese['application_deadline']).date().isoformat(), '2026-10-06')
        self.assertTrue(ese['source_url'].startswith('https://upsc.gov.in/active-examinations/'))

    def test_advertisement_links_english_pdf(self):
        """Each advertisement row yields one listing pointing at its English notification PDF."""
        items = list(self.spider.parse_advertisements(
            fixture_response('upsc_advertisements.html', 'https://upsc.gov.in/advertisements/')
        ))
        self.assertEqual(len(items), 1)
        advt = items[0]
        self.assertEqual(advt['job_id'], 'advt:2026-13')
        self.assertEqual(
            advt['notification_pdf_url'],
            'https://www.upsc.gov.in/uploads/2026/11/AdvtNo-13-2026-Engl-131126_0.pdf',
        )
        self.assertEqual(_parse_dt(advt['published_at']).date().isoformat(), '2026-11-13')

"""
Tests for the dedicated govt-job spiders, run against real pages saved in test_fixtures/.

Each recruiter gets its own spider (the generic one produced mostly results and
admit cards), so each gets a parsing test here that pins the page structure it
relies on. When a recruiter redesigns its site, the live run logs FAILED and
the fix starts by saving the new page over the fixture.
"""
import json
from datetime import datetime, timezone as dt_timezone
from pathlib import Path
from unittest import mock

from django.test import SimpleTestCase, TestCase
from scrapy.http import HtmlResponse, TextResponse

from scrapers.pipelines import _parse_dt
from scrapers.spiders.ibps_spider import IbpsSpider
from scrapers.spiders.rrb_spider import RrbSpider
from scrapers.spiders.ssc_spider import SscSpider
from scrapers.spiders.upsc_spider import UpscSpider

FIXTURES = Path(__file__).parent / 'test_fixtures'


def fixture_response(name, url):
    """Wrap a saved HTML fixture in a Scrapy HtmlResponse as if downloaded from `url`."""
    return HtmlResponse(url=url, body=(FIXTURES / name).read_bytes(), encoding='utf-8')


def text_response(url, body):
    """A non-HTML response (JSON / JavaScript) with the given body."""
    return TextResponse(url=url, body=body.encode('utf-8') if isinstance(body, str) else body, encoding='utf-8')


class SscSpiderTests(SimpleTestCase):
    """SSC live-exams API (response saved 24 Nov 2026, plus a synthetic public exam)."""

    API = 'https://ssc.gov.in/api/admin/5.1/liveExams'

    def setUp(self):
        """Spider as run_source() launches it."""
        self.spider = SscSpider(source_portal='ssc.gov.in')

    def test_departmental_exams_are_skipped(self):
        """The saved response's only live exam is an LDCE (serving employees only) → no listings."""
        items = list(self.spider.parse(text_response(self.API, (FIXTURES / 'ssc_live_exams.json').read_bytes())))
        self.assertEqual(items, [])

    def test_public_exam_maps_dates_and_pdf(self):
        """A public exam keeps its ISO deadline and links its notice through /api/attachment/."""
        payload = {'statusCode': '200', 'data': [{
            'id': 'cgl2027', 'examName': 'Combined Graduate Level Examination, 2027',
            'applicationStartDate': '2027-06-01', 'applicationEndDate': '2027-07-04T17:30:00.000Z',
            'examDate': None, 'minAge': 18, 'maxAge': 32,
            'attachments': [{'fileName': 'Notice_CGL_2027.pdf', 'path': 'uploads\\masterData\\Notice_CGL_2027.pdf'}],
        }]}
        [item] = self.spider.parse(text_response(self.API, json.dumps(payload)))
        self.assertEqual(item['job_id'], 'exam:cgl2027')
        self.assertEqual(_parse_dt(item['application_deadline']), datetime(2027, 7, 4, 17, 30, tzinfo=dt_timezone.utc))
        self.assertEqual(item['notification_pdf_url'], 'https://ssc.gov.in/api/attachment/uploads/masterData/Notice_CGL_2027.pdf')
        self.assertEqual(item['age_limit'], '18–32 years')

    def test_api_error_is_logged(self):
        """A non-200 payload is an error (so the run fails) rather than 'nothing open'."""
        with self.assertLogs('scrapers.spiders.ssc_spider', level='ERROR'):
            items = list(self.spider.parse(text_response(self.API, '{"statusCode": "203", "statusMessage": "Error Occurred!"}')))
        self.assertEqual(items, [])


class IbpsSpiderTests(SimpleTestCase):
    """IBPS recruitment and CRP-updates pages saved 24 Nov 2026."""

    def setUp(self):
        """Spider as run_source() launches it."""
        self.spider = IbpsSpider(source_portal='ibps.in')

    def test_recruitment_entries(self):
        """All six recruitment entries become listings linked to their registration pages."""
        items = list(self.spider.parse_recruitment(
            fixture_response('ibps_recruitment.html', 'https://www.ibps.in/index.php/recruitment/')
        ))
        self.assertEqual(len(items), 6)
        manit = next(i for i in items if i['title'].startswith('MANIT'))
        self.assertEqual(manit['job_id'], 'rec:manitboct26')
        self.assertEqual(manit['source_url'], 'https://ibpsreg.ibps.in/manitboct26/')
        self.assertEqual(_parse_dt(manit['application_deadline']).date().isoformat(), '2026-12-10')
        self.assertEqual(manit['category'], 'psu')
        sbi = next(i for i in items if i['job_id'] == 'rec:sbiameoct26')
        self.assertEqual(sbi['category'], 'banking')
        self.assertEqual(_parse_dt(sbi['application_deadline']).date().isoformat(), '2026-11-25')  # "25-Nov-26"

    def test_crp_only_recent_notifications(self):
        """Only 'Notification for Common Recruitment Process' entries younger than CRP_MAX_AGE_DAYS."""
        response = fixture_response('ibps_crp_updates.html', 'https://www.ibps.in/index.php/crp-updates/')
        self.assertEqual(list(self.spider.parse_crp(response)), [])  # July notifications, run in November

        july = datetime(2026, 7, 10, tzinfo=dt_timezone.utc)
        with mock.patch('scrapers.spiders.ibps_spider.timezone.now', return_value=july):
            items = list(self.spider.parse_crp(response))
        self.assertEqual(sorted(i['job_id'] for i in items), ['crp:crp-po/mts-xvi', 'crp:crp-spl-xvi'])
        self.assertTrue(all(i['notification_pdf_url'].endswith('.pdf') for i in items))


class RrbSpiderTests(SimpleTestCase):
    """rrbapply.gov.in portal page and ticker chunk excerpt saved 24 Nov 2026."""

    def setUp(self):
        """Spider as run_source() launches it."""
        self.spider = RrbSpider(source_portal='rrbapply.gov.in')

    def test_portal_page_leads_to_main_bundle(self):
        """The spider discovers the current main-*.js from the portal page."""
        [request] = self.spider.parse_portal(fixture_response('rrb_portal.html', 'https://www.rrbapply.gov.in/'))
        self.assertEqual(request.url, 'https://www.rrbapply.gov.in/main-ZSFRC7L3.js')

    def test_ticker_yields_one_item_per_cen_with_latest_deadline(self):
        """Three CENs; CEN 07/26's extension notice moves its deadline to 15 Nov but keeps the clean title."""
        chunk = text_response('https://www.rrbapply.gov.in/chunk-CYQUEEDT.js', (FIXTURES / 'rrb_ticker_chunk.js').read_bytes())
        items = {i['job_id']: i for i in self.spider.parse_chunk(chunk, counted=False)}
        self.assertEqual(sorted(items), ['cen:07/2026', 'cen:08/2026', 'cen:09/2026'])
        ntpc = items['cen:07/2026']
        self.assertEqual(
            ntpc['title'],
            'RRB CEN 07/2026 — Recruitment for the various posts of Non Technical Popular Categories (Under Graduate)',
        )
        # 15.11.2026 23:59 IST
        self.assertEqual(_parse_dt(ntpc['application_deadline']), datetime(2026, 11, 15, 18, 29, tzinfo=dt_timezone.utc))
        self.assertEqual(items['cen:08/2026']['title'], 'RRB CEN 08/2026 — STATION MASTER')

    def test_missing_ticker_is_logged(self):
        """When no chunk has the ticker, the run logs an error (portal changed) instead of 'nothing open'."""
        self.spider.pending_chunks = 1
        with self.assertLogs('scrapers.spiders.rrb_spider', level='ERROR'):
            items = list(self.spider.parse_chunk(text_response('https://www.rrbapply.gov.in/chunk-X.js', 'var a=1;')))
        self.assertEqual(items, [])


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


class GovtJobAlertApiTests(TestCase):
    """The web Alerts page's govt job alert calls: create, pause (PATCH), delete — own alerts only."""

    def test_owner_can_pause_and_delete_and_others_cannot(self):
        from rest_framework.test import APIClient
        from apps.authentication.models import User
        from apps.govtjobs.models import GovtJobAlert
        seeker = User.objects.create_user(username='ravi', email='r@example.com', password='x', is_job_seeker=True)
        other = User.objects.create_user(username='mira', email='m@example.com', password='x', is_job_seeker=True)
        api = APIClient()
        api.force_authenticate(seeker)
        alert_id = api.post('/api/govtjobs/alerts/', {'keyword': 'clerk', 'state': 'Kerala', 'category': 'state_govt'},
                            format='json').data['id']

        api.force_authenticate(other)
        self.assertEqual(api.patch(f'/api/govtjobs/alerts/{alert_id}/', {'is_active': False}, format='json').status_code, 404)
        self.assertEqual(api.delete(f'/api/govtjobs/alerts/{alert_id}/').status_code, 404)

        api.force_authenticate(seeker)
        self.assertEqual(api.patch(f'/api/govtjobs/alerts/{alert_id}/', {'is_active': False}, format='json').status_code, 200)
        self.assertFalse(GovtJobAlert.objects.get(pk=alert_id).is_active)
        self.assertEqual(api.delete(f'/api/govtjobs/alerts/{alert_id}/').status_code, 204)
        self.assertFalse(GovtJobAlert.objects.exists())

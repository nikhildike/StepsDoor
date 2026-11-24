"""
Tests for the scrape pipeline's run bookkeeping and listing expiry.

Covers the pieces that decide what users see and what admins monitor, without
hitting any real portal:
  - scrapers.spiders.generic_tender_spider (NIC markup, from saved real pages in test_fixtures/)
  - scrapers.pipelines._parse_dt / _is_open (IST dates, deadline visibility)
  - scrapers.pipelines.ScraperLogPipeline (final run status + last_scraped_at)
  - apps.tenders.scraping.run_source (crash/timeout handling, subprocess mocked)
  - apps.tenders.tasks.expire_stale_listings (which listings get hidden)
"""
import asyncio
import subprocess
from datetime import datetime, timedelta, timezone as dt_timezone
from pathlib import Path
from types import SimpleNamespace
from unittest import mock

from django.test import TestCase, override_settings
from django.utils import timezone
from scrapy.http import HtmlResponse

from apps.govtjobs.models import GovtJob
from apps.tenders.models import ScraperLog, ScraperSource, Tender
from apps.tenders.scraping import run_source
from apps.tenders.tasks import expire_stale_listings
from scrapers.pipelines import ScraperLogPipeline, _is_open, _parse_deadline, _parse_dt
from scrapers.spiders.generic_tender_spider import GenericTenderSpider

# Real pages saved from etenders.hry.nic.in (24 Nov 2026): the NIC home page,
# one tender's detail page, and the page a detail link returns without the session.
FIXTURES = Path(__file__).parent / 'test_fixtures'


def fixture_response(name, url):
    """Wrap a saved HTML fixture in a Scrapy HtmlResponse as if downloaded from `url`."""
    return HtmlResponse(url=url, body=(FIXTURES / name).read_bytes(), encoding='utf-8')


class GenericTenderSpiderTests(TestCase):
    """Parsing of real NIC eProcurement markup (no network)."""

    HOME = 'https://etenders.hry.nic.in/nicgep/app'

    def setUp(self):
        """Spider configured the way run_source() launches it for a bare-domain source."""
        self.spider = GenericTenderSpider(start_url='https://etenders.hry.nic.in', source_portal='etenders.hry.nic.in')

    def test_bare_domain_starts_at_nic_app(self):
        """A bare portal URL is sent straight to /nicgep/app; eprocure.gov.in to /eprocure/app."""
        async def first_url(spider):
            async for request in spider.start():
                return request.url
        self.assertEqual(asyncio.run(first_url(self.spider)), self.HOME)
        central = GenericTenderSpider(start_url='https://eprocure.gov.in')
        self.assertEqual(asyncio.run(first_url(central)), 'https://eprocure.gov.in/eprocure/app')

    def test_listing_follows_only_latest_tender_rows(self):
        """Only the 10 Latest Tenders rows are followed — not corrigenda or layout tables."""
        requests = list(self.spider.parse(fixture_response('nic_home.html', self.HOME)))
        self.assertEqual(len(requests), 10)
        first = requests[0].cb_kwargs['listing']
        self.assertTrue(first['title'].startswith('Repair of various damaged streets'))  # serial "1." stripped
        self.assertEqual(first['submission_deadline'], '01-Dec-2026 05:00 PM')

    def test_detail_page_yields_complete_item(self):
        """The detail page's caption/field pairs map onto the Tender item fields."""
        listing = {'title': 'x', 'reference_number': 'ref', 'submission_deadline': '', 'opening_date': '', 'portal_home': self.HOME}
        items = list(self.spider.parse_detail(fixture_response('nic_tender_detail.html', self.HOME + '?detail'), listing))
        self.assertEqual(len(items), 1)
        item = items[0]
        self.assertEqual(item['tender_id'], '2026_HRY_562238_1')
        self.assertEqual(item['organisation'], 'Haryana Government / Urban Local Bodies / MC Karnal')
        self.assertEqual(item['estimated_value'], 1228141.0)
        self.assertEqual(item['emd_amount'], 24560.0)
        self.assertEqual(item['submission_deadline'], '01-Dec-2026 05:00 PM')
        self.assertEqual(item['category'], 'civil')
        self.assertEqual(item['source_url'], self.HOME)  # session-bound detail URL never exposed to users

    def test_session_timeout_page_is_skipped(self):
        """A 'session timed out' page yields nothing (and logs an error) instead of a half-empty item."""
        listing = {'title': 'x', 'reference_number': 'ref', 'submission_deadline': '', 'opening_date': '', 'portal_home': self.HOME}
        with self.assertLogs('scrapers.spiders.generic_tender_spider', level='ERROR'):
            items = list(self.spider.parse_detail(fixture_response('nic_session_timeout.html', self.HOME), listing))
        self.assertEqual(items, [])


class ParseDateTests(TestCase):
    """Scraped dates are DD/MM/YYYY in IST and must be stored as the right instant."""

    def test_naive_date_is_interpreted_as_ist(self):
        """17:00 IST on a portal is 11:30 UTC, not 17:00 UTC."""
        parsed = _parse_dt('05/12/2026 17:00')
        self.assertEqual(parsed, datetime(2026, 12, 5, 11, 30, tzinfo=dt_timezone.utc))

    def test_iso_dates_keep_month_and_day(self):
        """ISO strings from APIs aren't day-first: 2026-12-08 is 8 December, not 12 August."""
        self.assertEqual(
            _parse_dt('2026-12-08T17:30:00.000Z'),
            datetime(2026, 12, 8, 17, 30, tzinfo=dt_timezone.utc),
        )
        self.assertEqual(_parse_dt('2026-11-07').date().isoformat(), '2026-11-07')

    def test_date_only_deadline_means_end_of_day(self):
        """'10-Dec-2026' stays open all of 10 Dec IST; an explicit time is kept as-is."""
        self.assertEqual(_parse_deadline('10-Dec-2026'), datetime(2026, 12, 10, 18, 29, 59, tzinfo=dt_timezone.utc))
        self.assertEqual(_parse_deadline('01-Dec-2026 05:00 PM'), datetime(2026, 12, 1, 11, 30, tzinfo=dt_timezone.utc))
        self.assertIsNone(_parse_deadline(''))

    def test_unparseable_or_empty_returns_none(self):
        """Junk cells fall back to None so the pipeline's defaults apply."""
        self.assertIsNone(_parse_dt(''))
        self.assertIsNone(_parse_dt('not a date'))

    def test_is_open(self):
        """Missing deadline counts as open; a past deadline does not."""
        self.assertTrue(_is_open(None))
        self.assertTrue(_is_open(timezone.now() + timedelta(days=1)))
        self.assertFalse(_is_open(timezone.now() - timedelta(minutes=1)))


class ScraperLogPipelineTests(TestCase):
    """The status rules in ScraperLogPipeline._close_sync."""

    def setUp(self):
        """One tender source and the RUNNING log a run of it would start with."""
        self.source = ScraperSource.objects.create(url='https://etenders.example.gov.in/list')
        self.log = ScraperLog.objects.create(portal=self.source.source_portal)
        self.spider = SimpleNamespace(name='generic_tender')

    def close(self, reason='finished', errors=0, found=0, new=0):
        """Run the pipeline's close step with the given counters; return the refreshed log."""
        pipeline = ScraperLogPipeline()
        pipeline.log = self.log
        pipeline.items_found, pipeline.items_new = found, new
        pipeline._close_sync(self.spider, reason, errors)
        self.log.refresh_from_db()
        self.source.refresh_from_db()
        return self.log

    def test_clean_run_is_success_and_stamps_source(self):
        """Items, no errors, normal finish → SUCCESS with counts, and last_scraped_at set."""
        log = self.close(found=5, new=2)
        self.assertEqual(log.status, ScraperLog.Status.SUCCESS)
        self.assertEqual((log.items_found, log.items_new), (5, 2))
        self.assertIsNotNone(log.finished_at)
        self.assertEqual(self.source.last_scraped_at, log.finished_at)

    def test_zero_items_is_failed(self):
        """A run that saved nothing is a failure and must not count as a healthy scrape."""
        log = self.close(found=0)
        self.assertEqual(log.status, ScraperLog.Status.FAILED)
        self.assertIsNone(self.source.last_scraped_at)

    def test_errors_or_timeout_with_items_is_partial(self):
        """Data was saved but the run wasn't clean → PARTIAL, still stamps the source."""
        self.assertEqual(self.close(found=3, errors=2).status, ScraperLog.Status.PARTIAL)
        self.assertEqual(self.close(found=3, reason='closespider_timeout').status, ScraperLog.Status.PARTIAL)
        self.assertIsNotNone(self.source.last_scraped_at)

    def test_empty_ok_spider_with_nothing_open_is_success(self):
        """A spider that opts in with empty_ok may legitimately find nothing; errors still fail it."""
        self.spider.empty_ok = True
        self.assertEqual(self.close(found=0).status, ScraperLog.Status.SUCCESS)
        self.assertEqual(self.close(found=0, errors=1).status, ScraperLog.Status.FAILED)

    def test_abnormal_finish_is_failed(self):
        """Shutdown/cancel reasons fail the run even if some items were saved."""
        self.assertEqual(self.close(found=3, reason='shutdown').status, ScraperLog.Status.FAILED)

    def test_only_matching_spider_source_is_stamped(self):
        """A tender run doesn't stamp a govt-job source registered on the same domain."""
        jobs_source = ScraperSource.objects.create(
            url='https://etenders.example.gov.in/careers', source_type=ScraperSource.TYPE_GOVT_JOB,
        )
        self.close(found=1)
        jobs_source.refresh_from_db()
        self.assertIsNone(jobs_source.last_scraped_at)


@override_settings(SCRAPER_RUN_TIMEOUT=600)
class RunSourceTests(TestCase):
    """run_source() must leave a FAILED log whenever the crawl process doesn't finish properly."""

    def setUp(self):
        """A source to run; subprocess.run is mocked in every test."""
        self.source = ScraperSource.objects.create(url='https://etenders.example.gov.in/list')

    def run_with(self, **mock_kwargs):
        """Call run_source with subprocess.run patched; return (log, mock)."""
        with mock.patch('apps.tenders.scraping.subprocess.run', **mock_kwargs) as run:
            return run_source(self.source), run

    def test_passes_log_id_and_portal_to_spider(self):
        """The child crawl gets the pre-created log id so the pipeline updates that row."""
        log, run = self.run_with(return_value=subprocess.CompletedProcess([], 0, stdout=''))
        command = run.call_args.args[0]
        self.assertIn(f'scraper_log_id={log.id}', command)
        self.assertIn('source_portal=etenders.example.gov.in', command)
        self.assertEqual(log.portal, 'etenders.example.gov.in')

    def test_nonzero_exit_is_failed_with_output_tail(self):
        """A crashed crawl records the end of its output for debugging."""
        log, _ = self.run_with(return_value=subprocess.CompletedProcess([], 1, stdout='Traceback ... KeyError'))
        self.assertEqual(log.status, ScraperLog.Status.FAILED)
        self.assertIn('KeyError', log.error_message)

    def test_timeout_is_failed(self):
        """A hung crawl is killed and recorded as FAILED."""
        log, _ = self.run_with(side_effect=subprocess.TimeoutExpired(cmd='scrapy', timeout=600))
        self.assertEqual(log.status, ScraperLog.Status.FAILED)
        self.assertIn('600s', log.error_message)
        self.assertIsNotNone(log.finished_at)

    def test_clean_exit_without_result_is_failed(self):
        """Exit 0 but the pipeline never closed the log (e.g. unknown spider) → FAILED, not stuck RUNNING."""
        log, _ = self.run_with(return_value=subprocess.CompletedProcess([], 0, stdout=''))
        self.assertEqual(log.status, ScraperLog.Status.FAILED)

    def test_result_recorded_by_pipeline_is_kept(self):
        """When the child process's pipeline already finalized the log, run_source leaves it alone."""
        def finish_log(*args, **kwargs):
            ScraperLog.objects.filter(portal=self.source.source_portal).update(
                status=ScraperLog.Status.SUCCESS, items_found=4, finished_at=timezone.now(),
            )
            return subprocess.CompletedProcess([], 0, stdout='')

        log, _ = self.run_with(side_effect=finish_log)
        self.assertEqual((log.status, log.items_found), (ScraperLog.Status.SUCCESS, 4))


@override_settings(LISTING_STALE_DAYS=14, SCRAPER_RUN_TIMEOUT=600)
class ExpireStaleListingsTests(TestCase):
    """Which listings expire_stale_listings hides, and which it must leave alone."""

    def setUp(self):
        """A healthy tender portal (scraped an hour ago) and a broken one (never scraped OK)."""
        now = timezone.now()
        self.healthy = ScraperSource.objects.create(url='https://healthy.example.gov.in/list')
        ScraperSource.objects.filter(pk=self.healthy.pk).update(last_scraped_at=now - timedelta(hours=1))
        self.broken = ScraperSource.objects.create(url='https://broken.example.gov.in/list')

    def tender(self, portal, tender_id, deadline=None, last_seen_days_ago=0):
        """Create an active tender, back-dating updated_at to simulate when it was last scraped."""
        tender = Tender.objects.create(
            source_portal=portal, tender_id=tender_id, title=tender_id, organisation='Dept',
            state='Haryana', published_at=timezone.now(), source_url='https://x.example/t',
            submission_deadline=deadline,
        )
        Tender.objects.filter(pk=tender.pk).update(
            updated_at=timezone.now() - timedelta(days=last_seen_days_ago),
        )
        return tender

    def active_ids(self):
        """tender_ids still visible after the task runs."""
        return set(Tender.objects.filter(is_active=True).values_list('tender_id', flat=True))

    def test_hides_past_deadline_and_unseen_on_healthy_portal_only(self):
        """Past deadline → hidden anywhere; unseen → hidden only where the portal scrapes fine."""
        yesterday = timezone.now() - timedelta(days=1)
        self.tender('healthy.example.gov.in', 'open')
        self.tender('healthy.example.gov.in', 'closed', deadline=yesterday)
        self.tender('healthy.example.gov.in', 'gone', last_seen_days_ago=20)
        self.tender('broken.example.gov.in', 'old-on-broken', last_seen_days_ago=20)
        self.tender('broken.example.gov.in', 'closed-on-broken', deadline=yesterday)

        counts = expire_stale_listings()

        self.assertEqual(self.active_ids(), {'open', 'old-on-broken'})
        self.assertEqual(counts['Tender_past_deadline'], 2)
        self.assertEqual(counts['Tender_unseen'], 1)

    def test_covers_govt_jobs(self):
        """Govt jobs past their application deadline are hidden too."""
        GovtJob.objects.create(
            source_portal='healthy.example.gov.in', job_id='j1', title='Clerk', organisation='Dept',
            published_at=timezone.now(), source_url='https://x.example/j',
            application_deadline=timezone.now() - timedelta(days=1),
        )
        self.assertEqual(expire_stale_listings()['GovtJob_past_deadline'], 1)
        self.assertFalse(GovtJob.objects.get(job_id='j1').is_active)

    def test_closes_dead_running_logs(self):
        """A log stuck RUNNING well past the run timeout becomes FAILED; a fresh one is left alone."""
        dead = ScraperLog.objects.create(portal='healthy.example.gov.in')
        ScraperLog.objects.filter(pk=dead.pk).update(started_at=timezone.now() - timedelta(hours=1))
        live = ScraperLog.objects.create(portal='healthy.example.gov.in')

        expire_stale_listings()

        dead.refresh_from_db()
        live.refresh_from_db()
        self.assertEqual(dead.status, ScraperLog.Status.FAILED)
        self.assertEqual(live.status, ScraperLog.Status.RUNNING)


class ScheduleTests(TestCase):
    """setup_scraper_schedule and the Beat fan-out tasks it schedules."""

    def test_schedule_command_is_idempotent_and_reset_restores(self):
        """First run creates all entries; a re-run keeps admin edits; --reset restores defaults."""
        from io import StringIO
        from django.core.management import call_command
        from django_celery_beat.models import PeriodicTask
        from apps.tenders.management.commands.setup_scraper_schedule import SCHEDULE

        call_command('setup_scraper_schedule', stdout=StringIO())
        self.assertEqual(set(PeriodicTask.objects.values_list('name', flat=True)), set(SCHEDULE))
        hourly = PeriodicTask.objects.get(name='Scrape tender portals (hourly)')
        self.assertEqual((hourly.crontab.minute, hourly.crontab.hour, str(hourly.crontab.timezone)), ('5', '*', 'Asia/Kolkata'))

        PeriodicTask.objects.filter(pk=hourly.pk).update(enabled=False)  # an admin pauses it
        call_command('setup_scraper_schedule', stdout=StringIO())
        self.assertFalse(PeriodicTask.objects.get(pk=hourly.pk).enabled)
        self.assertEqual(PeriodicTask.objects.count(), len(SCHEDULE))  # no duplicates

        call_command('setup_scraper_schedule', '--reset', stdout=StringIO())
        self.assertTrue(PeriodicTask.objects.get(pk=hourly.pk).enabled)

    def test_fan_out_queues_active_sources_with_expiry(self):
        """scrape_all_portals queues one task per ACTIVE tender source, each expiring before the next round."""
        from apps.tenders.tasks import scrape_all_portals, scrape_portal
        ScraperSource.objects.create(url='https://a.example.gov.in')
        ScraperSource.objects.create(url='https://off.example.gov.in', is_active=False)
        ScraperSource.objects.create(url='https://jobs.example.gov.in', source_type=ScraperSource.TYPE_GOVT_JOB)

        with mock.patch.object(scrape_portal, 'apply_async') as apply_async:
            self.assertEqual(scrape_all_portals(expires_seconds=3000), 1)
        apply_async.assert_called_once_with(args=['a.example.gov.in'], expires=3000)


class MembersOnlyApiTests(TestCase):
    """Scraped tenders and govt jobs are only served to logged-in users."""

    ENDPOINTS = ('/api/tenders/', '/api/tenders/states/', '/api/govtjobs/', '/api/govtjobs/states/')

    def setUp(self):
        """One visible tender and govt job, plus a regular job-seeker account."""
        from apps.authentication.models import User
        self.tender = Tender.objects.create(
            source_portal='etenders.hry.nic.in', tender_id='2026_HRY_1_1', title='Road repair',
            organisation='MC Karnal', state='Haryana', published_at=timezone.now(),
            source_url='https://etenders.hry.nic.in/nicgep/app',
        )
        self.job = GovtJob.objects.create(
            source_portal='upsc.gov.in', job_id='advt:2026-13', title='UPSC Advt 13/2026',
            organisation='UPSC', published_at=timezone.now(), source_url='https://upsc.gov.in/advertisements/',
        )
        self.user = User.objects.create_user(username='seeker', email='seeker@example.com', password='x', is_job_seeker=True)

    def test_anonymous_gets_401_everywhere(self):
        """List, detail and the /states/ facet all refuse anonymous requests."""
        from rest_framework.test import APIClient
        client = APIClient()
        urls = list(self.ENDPOINTS) + [f'/api/tenders/{self.tender.pk}/', f'/api/govtjobs/{self.job.pk}/']
        for url in urls:
            with self.subTest(url=url):
                self.assertEqual(client.get(url).status_code, 401)

    def test_logged_in_user_can_browse(self):
        """Any authenticated account (not just contractors) can list and open listings."""
        from rest_framework.test import APIClient
        client = APIClient()
        client.force_authenticate(self.user)
        for url in self.ENDPOINTS:
            with self.subTest(url=url):
                self.assertEqual(client.get(url).status_code, 200)
        self.assertEqual(client.get(f'/api/tenders/{self.tender.pk}/').data['tender_id'], '2026_HRY_1_1')
        self.assertEqual(client.get(f'/api/govtjobs/{self.job.pk}/').data['job_id'], 'advt:2026-13')


class PurgeLegacyListingsTests(TestCase):
    """purge_legacy_listings deletes only rows the retired generic spiders saved."""

    def test_keeps_current_spider_rows_and_deletes_the_rest(self):
        """NIC-keyed tenders and prefixed job ids survive; everything else goes; --dry-run deletes nothing."""
        from io import StringIO
        from django.core.management import call_command
        now = timezone.now()
        common = dict(organisation='Dept', published_at=now, source_url='https://x.example/')
        Tender.objects.create(source_portal='etenders.hry.nic.in', tender_id='2026_HRY_562238_1', title='keep', state='Haryana', **common)
        Tender.objects.create(source_portal='etenders.hry.nic.in', tender_id='2026C0BA8AB0 A1B4', title='legacy', state='Haryana', **common)
        GovtJob.objects.create(source_portal='rrbapply.gov.in', job_id='cen:08/2026', title='keep', **common)
        GovtJob.objects.create(source_portal='esic.gov.in', job_id='https-www-esic-gov-in-recruitments', title='legacy', **common)

        call_command('purge_legacy_listings', '--dry-run', stdout=StringIO())
        self.assertEqual((Tender.objects.count(), GovtJob.objects.count()), (2, 2))

        call_command('purge_legacy_listings', stdout=StringIO())
        self.assertEqual(list(Tender.objects.values_list('title', flat=True)), ['keep'])
        self.assertEqual(list(GovtJob.objects.values_list('title', flat=True)), ['keep'])


@override_settings(SCRAPER_ALERT_AFTER_FAILURES=3, SCRAPER_ALERT_EMAILS=['ops@example.com'])
class FailingScraperAlertTests(TestCase):
    """alert_failing_scrapers: who gets reported, and the email it sends."""

    def setUp(self):
        """Two active sources and one inactive one."""
        self.broken = ScraperSource.objects.create(url='https://broken.example.gov.in')
        self.flaky = ScraperSource.objects.create(url='https://flaky.example.gov.in')
        self.off = ScraperSource.objects.create(url='https://off.example.gov.in', is_active=False)

    def runs(self, source, *statuses):
        """Record runs oldest-first with the given statuses, spaced an hour apart."""
        start = timezone.now() - timedelta(hours=len(statuses))
        for i, status in enumerate(statuses):
            log = ScraperLog.objects.create(portal=source.source_portal, status=status, error_message=f'{status} #{i}')
            ScraperLog.objects.filter(pk=log.pk).update(started_at=start + timedelta(hours=i), finished_at=start + timedelta(hours=i))

    def test_reports_only_active_sources_with_a_long_enough_failure_streak(self):
        """3 consecutive failures → reported; a success inside the last 3 or an inactive source → not."""
        from django.core import mail
        from apps.tenders.tasks import alert_failing_scrapers
        S = ScraperLog.Status
        self.runs(self.broken, S.SUCCESS, S.FAILED, S.FAILED, S.FAILED)
        self.runs(self.flaky, S.FAILED, S.FAILED, S.PARTIAL, S.FAILED, S.FAILED)  # streak of 2
        self.runs(self.off, S.FAILED, S.FAILED, S.FAILED)

        with self.assertLogs('apps.tenders.tasks', level='ERROR'):
            self.assertEqual(alert_failing_scrapers(), 1)
        self.assertEqual(len(mail.outbox), 1)
        message = mail.outbox[0]
        self.assertEqual(message.to, ['ops@example.com'])
        self.assertIn('broken.example.gov.in', message.body)
        self.assertIn('3 failed runs', message.body)
        self.assertIn('failed #3', message.body)  # newest error
        self.assertNotIn('flaky.example.gov.in', message.body)
        self.assertNotIn('off.example.gov.in', message.body)

    def test_nothing_failing_sends_nothing(self):
        """No streaks → no email, returns 0."""
        from django.core import mail
        from apps.tenders.tasks import alert_failing_scrapers
        self.runs(self.broken, ScraperLog.Status.FAILED, ScraperLog.Status.SUCCESS)
        self.assertEqual(alert_failing_scrapers(), 0)
        self.assertEqual(mail.outbox, [])


@override_settings(
    EMAIL_BACKEND='anymail.backends.sendgrid.EmailBackend',
    ANYMAIL={'SENDGRID_API_KEY': 'SG.test-key'},
    DEFAULT_FROM_EMAIL='StepsDoor <noreply@stepsdoor.in>',
    SCRAPER_ALERT_EMAILS=['ops@example.com'],
    SCRAPER_ALERT_AFTER_FAILURES=1,
)
class SendGridEmailTests(TestCase):
    """
    The production email path: mail is posted to SendGrid's v3 API.

    Every test patches requests.Session.request — anymail sends even with an empty key,
    so an unpatched test would make a real call to api.sendgrid.com.
    """

    @staticmethod
    def sendgrid_response(status):
        """A fake requests.Response from SendGrid with the given status code."""
        body = '' if status == 202 else '{"errors": [{"message": "Permission denied, wrong credentials"}]}'
        return mock.Mock(status_code=status, text=body, content=body.encode(), headers={}, reason='')

    def test_alert_is_sent_through_sendgrid(self):
        """alert_failing_scrapers → anymail → POST https://api.sendgrid.com/v3/mail/send with our key and sender."""
        import json
        from apps.tenders.tasks import alert_failing_scrapers
        source = ScraperSource.objects.create(url='https://broken.example.gov.in')
        ScraperLog.objects.create(portal=source.source_portal, status=ScraperLog.Status.FAILED, error_message='no rows')

        with mock.patch('requests.Session.request', return_value=self.sendgrid_response(202)) as request,                 self.assertLogs('apps.tenders.tasks', level='ERROR'):
            self.assertEqual(alert_failing_scrapers(), 1)

        call = request.call_args.kwargs
        self.assertEqual((call['method'].upper(), call['url']), ('POST', 'https://api.sendgrid.com/v3/mail/send'))
        self.assertEqual(call['headers']['Authorization'], 'Bearer SG.test-key')
        payload = json.loads(call['data'])
        self.assertEqual(payload['from'], {'email': 'noreply@stepsdoor.in', 'name': 'StepsDoor'})
        self.assertEqual(payload['personalizations'][0]['to'], [{'email': 'ops@example.com'}])
        self.assertIn('broken.example.gov.in', payload['content'][0]['value'])

    def test_rejected_key_raises(self):
        """A wrong/empty key isn't silently ignored: SendGrid's 401 becomes an AnymailAPIError."""
        from anymail.exceptions import AnymailAPIError
        from django.core.mail import send_mail
        with mock.patch('requests.Session.request', return_value=self.sendgrid_response(401)):
            with self.assertRaises(AnymailAPIError):
                send_mail('s', 'b', None, ['ops@example.com'])

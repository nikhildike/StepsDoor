"""
Tests for the scrape pipeline's run bookkeeping and listing expiry.

Covers the pieces that decide what users see and what admins monitor, without
hitting any real portal:
  - scrapers.pipelines._parse_dt / _is_open (IST dates, deadline visibility)
  - scrapers.pipelines.ScraperLogPipeline (final run status + last_scraped_at)
  - apps.tenders.scraping.run_source (crash/timeout handling, subprocess mocked)
  - apps.tenders.tasks.expire_stale_listings (which listings get hidden)
"""
import subprocess
from datetime import datetime, timedelta, timezone as dt_timezone
from types import SimpleNamespace
from unittest import mock

from django.test import TestCase, override_settings
from django.utils import timezone

from apps.govtjobs.models import GovtJob
from apps.tenders.models import ScraperLog, ScraperSource, Tender
from apps.tenders.scraping import run_source
from apps.tenders.tasks import expire_stale_listings
from scrapers.pipelines import ScraperLogPipeline, _is_open, _parse_dt


class ParseDateTests(TestCase):
    """Scraped dates are DD/MM/YYYY in IST and must be stored as the right instant."""

    def test_naive_date_is_interpreted_as_ist(self):
        """17:00 IST on a portal is 11:30 UTC, not 17:00 UTC."""
        parsed = _parse_dt('05/12/2026 17:00')
        self.assertEqual(parsed, datetime(2026, 12, 5, 11, 30, tzinfo=dt_timezone.utc))

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

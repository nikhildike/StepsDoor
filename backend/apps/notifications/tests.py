"""
Tests for alert digest emails (apps.notifications.alert_emails) and the three daily
matching tasks that use it: match_tender_alerts, match_govtjob_alerts, match_job_alerts.

Mail goes to Django's in-memory test outbox (the test runner swaps in locmem), so
nothing is sent; time is moved by back-dating `created_at`/`last_checked_at`.
"""
from datetime import timedelta
from unittest import mock

from django.core import mail
from django.test import TestCase, override_settings
from django.utils import timezone

from apps.alerts.models import JobAlert
from apps.alerts.tasks import match_job_alerts
from apps.authentication.models import User
from apps.companies.models import Company
from apps.govtjobs.models import GovtJob, GovtJobAlert
from apps.govtjobs.tasks import match_govtjob_alerts
from apps.jobs.models import JobPost
from apps.jobseekers.models import JobSeeker
from apps.tenders.models import Tender, TenderAlert
from apps.tenders.tasks import match_tender_alerts
from apps.notifications.alert_emails import inr


def backdate(obj, **fields):
    """Set timestamp fields directly (bypasses auto_now_add) and refresh `obj`."""
    type(obj).objects.filter(pk=obj.pk).update(**fields)
    obj.refresh_from_db()
    return obj


@override_settings(FRONTEND_URL='https://stepsdoor.in', ALERT_EMAIL_MAX_ITEMS=20)
class TenderAlertDigestTests(TestCase):
    """The digest engine, exercised through tender alerts."""

    def setUp(self):
        """A contractor with an alert created two days ago, before any tenders existed."""
        self.user = User.objects.create_user(username='firm', email='firm@example.com', password='x', first_name='Asha')
        self.alert = backdate(
            TenderAlert.objects.create(user=self.user, keyword='road', state='Haryana'),
            created_at=timezone.now() - timedelta(days=2),
        )

    def tender(self, tender_id, title, state='Haryana', **extra):
        """Create an active tender (created now)."""
        return Tender.objects.create(
            source_portal='etenders.hry.nic.in', tender_id=tender_id, title=title, organisation='MC Karnal',
            state=state, published_at=timezone.now(), source_url='https://etenders.hry.nic.in/nicgep/app', **extra,
        )

    def test_emails_matches_once_with_links_and_details(self):
        """Matching tenders are emailed in one digest; a second run sends nothing new."""
        match = self.tender('2026_HRY_1_1', 'Road repair Ward 8', estimated_value=1228141,
                            submission_deadline=timezone.now() + timedelta(days=5))
        self.tender('2026_HRY_2_1', 'Road resurfacing', state='Punjab')   # wrong state
        self.tender('2026_HRY_3_1', 'Drain cleaning')                     # no keyword match

        counts = match_tender_alerts()
        self.assertEqual(counts, {'users_emailed': 1, 'listings_sent': 1, 'failed': 0})
        self.assertEqual(len(mail.outbox), 1)
        email = mail.outbox[0]
        self.assertEqual(email.to, ['firm@example.com'])
        self.assertEqual(email.subject, 'StepsDoor: 1 new match for your tender alerts')
        self.assertIn('Hi Asha', email.body)
        self.assertIn('Here is 1 new match', email.body)
        self.assertIn(f'https://stepsdoor.in/tenders/{match.pk}', email.body)
        self.assertIn('MC Karnal · Haryana · ₹12,28,141 · closes', email.body)
        self.assertIn('https://stepsdoor.in/seeker/alerts', email.body)
        html = email.alternatives[0][0]
        self.assertIn(f'href="https://stepsdoor.in/tenders/{match.pk}"', html)

        match_tender_alerts()
        self.assertEqual(len(mail.outbox), 1)  # already-sent listings aren't repeated

    def test_new_alert_does_not_get_older_listings(self):
        """Listings created before the alert existed aren't sent."""
        old = self.tender('2026_HRY_9_1', 'Road widening')
        backdate(old, created_at=timezone.now() - timedelta(days=3))
        self.assertEqual(match_tender_alerts()['users_emailed'], 0)
        self.assertEqual(mail.outbox, [])

    def test_two_alerts_one_email_no_duplicates(self):
        """A listing matched by two of the user's alerts appears once, in a single email."""
        backdate(TenderAlert.objects.create(user=self.user, keyword='ward'), created_at=self.alert.created_at)
        self.tender('2026_HRY_1_1', 'Road repair Ward 8')
        counts = match_tender_alerts()
        self.assertEqual((counts['users_emailed'], counts['listings_sent']), (1, 1))
        self.assertEqual(mail.outbox[0].body.count('Road repair Ward 8'), 1)

    def test_failed_send_is_retried_next_run(self):
        """If sending fails, last_checked_at doesn't move, so the same listings go out next time."""
        self.tender('2026_HRY_1_1', 'Road repair Ward 8')
        with mock.patch('django.core.mail.EmailMultiAlternatives.send', side_effect=OSError('smtp down')), \
                self.assertLogs('apps.notifications.alert_emails', level='ERROR'):
            self.assertEqual(match_tender_alerts()['failed'], 1)
        self.alert.refresh_from_db()
        self.assertIsNone(self.alert.last_checked_at)

        self.assertEqual(match_tender_alerts()['users_emailed'], 1)
        self.assertIn('Road repair Ward 8', mail.outbox[0].body)

    def test_paused_alerts_and_users_without_email_get_nothing(self):
        """Inactive alerts are skipped; a user with no email is skipped but not retried forever."""
        TenderAlert.objects.filter(pk=self.alert.pk).update(is_active=False)
        self.tender('2026_HRY_1_1', 'Road repair Ward 8')
        self.assertEqual(match_tender_alerts()['users_emailed'], 0)

        TenderAlert.objects.filter(pk=self.alert.pk).update(is_active=True)
        User.objects.filter(pk=self.user.pk).update(email='')
        self.assertEqual(match_tender_alerts()['users_emailed'], 0)
        self.alert.refresh_from_db()
        self.assertIsNotNone(self.alert.last_checked_at)
        self.assertEqual(mail.outbox, [])

    @override_settings(ALERT_EMAIL_MAX_ITEMS=2)
    def test_long_digests_are_capped(self):
        """Beyond ALERT_EMAIL_MAX_ITEMS the email says '…and N more'."""
        for i in range(5):
            self.tender(f'2026_HRY_{i}_1', f'Road job {i}')
        match_tender_alerts()
        body = mail.outbox[0].body
        self.assertEqual(mail.outbox[0].subject, 'StepsDoor: 5 new matches for your tender alerts')
        self.assertEqual(body.count('/tenders/'), 2)
        self.assertIn('…and 3 more government tenders', body)


@override_settings(FRONTEND_URL='https://stepsdoor.in')
class GovtJobAndJobAlertDigestTests(TestCase):
    """Govt job and private job alerts use the same engine with their own filters."""

    def test_govt_job_alert(self):
        """Keyword + category filters; link to /govt-jobs/<id>."""
        user = User.objects.create_user(username='seeker', email='seeker@example.com', password='x')
        backdate(GovtJobAlert.objects.create(user=user, keyword='station master', category='railway'),
                 created_at=timezone.now() - timedelta(days=1))
        job = GovtJob.objects.create(
            source_portal='rrbapply.gov.in', job_id='cen:08/2026', title='RRB CEN 08/2026 — STATION MASTER',
            organisation='Railway Recruitment Boards (RRB)', category='railway', published_at=timezone.now(),
            source_url='https://www.rrbapply.gov.in/', application_deadline=timezone.now() + timedelta(days=3),
        )
        GovtJob.objects.create(source_portal='upsc.gov.in', job_id='advt:2026-13', title='UPSC advt',
                               organisation='UPSC', category='civil_services', published_at=timezone.now(),
                               source_url='https://upsc.gov.in/')
        self.assertEqual(match_govtjob_alerts()['listings_sent'], 1)
        self.assertEqual(mail.outbox[0].subject, 'StepsDoor: 1 new match for your government job alerts')
        self.assertIn(f'https://stepsdoor.in/govt-jobs/{job.pk}', mail.outbox[0].body)
        self.assertIn('apply by', mail.outbox[0].body)

    def test_job_alert_filters(self):
        """City/type/keyword/salary filters; expired or inactive jobs and jobs without salary are left out."""
        employer = User.objects.create_user(username='acme', email='hr@acme.example', password='x', is_company=True)
        company = Company.objects.create(user=employer, name='Acme', contact_email='hr@acme.example')
        seeker_user = User.objects.create_user(username='ravi', email='ravi@example.com', password='x', is_job_seeker=True)
        seeker = JobSeeker.objects.create(user=seeker_user)
        backdate(JobAlert.objects.create(job_seeker=seeker, role_keyword='developer', city='pune',
                                         job_type='full_time', salary_min=600000),
                 created_at=timezone.now() - timedelta(days=1))

        def post(title, **kw):
            """A full-time Pune job paying up to 9 LPA unless overridden."""
            fields = dict(company=company, title=title, description='d', location='Hinjewadi', city='Pune',
                          job_type='full_time', salary_min=500000, salary_max=900000,
                          redirect_url='https://acme.example/careers')
            fields.update(kw)
            return JobPost.objects.create(**fields)

        good = post('Python Developer')
        post('Python Developer (Mumbai)', city='Mumbai')
        post('Developer intern', job_type='internship')
        post('Junior Developer', salary_min=200000, salary_max=400000)
        post('Developer, salary hidden', salary_min=None, salary_max=None)
        post('Developer, closed', is_active=False)
        post('Developer, expired', expires_at=timezone.now() - timedelta(hours=1))

        self.assertEqual(match_job_alerts()['listings_sent'], 1)
        body = mail.outbox[0].body
        self.assertEqual(mail.outbox[0].to, ['ravi@example.com'])
        self.assertIn(f'https://stepsdoor.in/jobs/{good.pk}', body)
        self.assertIn('Acme · Pune · Full Time · ₹5,00,000–₹9,00,000', body)


class InrFormatTests(TestCase):
    """Indian digit grouping for amounts in digests."""

    def test_grouping(self):
        """Lakh/crore grouping, small amounts untouched, decimals dropped."""
        self.assertEqual(inr(999), '₹999')
        self.assertEqual(inr(1000), '₹1,000')
        self.assertEqual(inr(100000), '₹1,00,000')
        self.assertEqual(inr(1228141.75), '₹12,28,141')
        self.assertEqual(inr(130707970), '₹13,07,07,970')

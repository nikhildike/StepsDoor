"""
Tests for alert digests (apps.notifications.alert_emails) - email and push - the three
daily matching tasks that use them, the Expo push sender (apps.notifications.push) and
the device push-token API (PushTokenView).

Mail goes to Django's in-memory test outbox (the test runner swaps in locmem) and every
test that registers a device patches requests.post, so nothing leaves the machine; time is moved by back-dating `created_at`/`last_checked_at`.
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
        self.assertEqual(counts, {'users_emailed': 1, 'users_pushed': 0, 'listings_sent': 1, 'failed': 0})
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


EXPO_TOKEN = 'ExponentPushToken[aaaaaaaaaaaaaaaaaaaaaa]'


def expo_response(*tickets):
    """A fake requests.Response from Expo's push API carrying the given tickets."""
    response = mock.Mock(status_code=200)
    response.json.return_value = {'data': list(tickets)}
    response.raise_for_status.return_value = None
    return response


OK_TICKET = {'status': 'ok', 'id': 'receipt-1'}
GONE_TICKET = {'status': 'error', 'message': 'not registered', 'details': {'error': 'DeviceNotRegistered'}}


class PushTokenApiTests(TestCase):
    """POST/DELETE /api/notifications/push-token/."""

    URL = '/api/notifications/push-token/'

    def setUp(self):
        """Two accounts that might share a phone."""
        from rest_framework.test import APIClient
        self.alice = User.objects.create_user(username='alice', email='a@example.com', password='x')
        self.bob = User.objects.create_user(username='bob', email='b@example.com', password='x')
        self.api = APIClient()

    def test_requires_login(self):
        """Anonymous registration is refused."""
        self.assertEqual(self.api.post(self.URL, {'token': EXPO_TOKEN}, format='json').status_code, 401)

    def test_register_is_idempotent_and_moves_between_accounts(self):
        """201 then 200 for the same user; a second account on the same device takes the token over."""
        from apps.notifications.models import FCMToken
        self.api.force_authenticate(self.alice)
        self.assertEqual(self.api.post(self.URL, {'token': EXPO_TOKEN}, format='json').status_code, 201)
        self.assertEqual(self.api.post(self.URL, {'token': EXPO_TOKEN}, format='json').status_code, 200)
        self.api.force_authenticate(self.bob)
        self.api.post(self.URL, {'token': EXPO_TOKEN}, format='json')
        self.assertEqual(list(FCMToken.objects.values_list('user__username', flat=True)), ['bob'])

    def test_rejects_non_expo_tokens(self):
        """Raw FCM tokens can't be sent through Expo, so they're refused."""
        self.api.force_authenticate(self.alice)
        self.assertEqual(self.api.post(self.URL, {'token': 'fcm-raw-token-123'}, format='json').status_code, 400)

    def test_delete_only_removes_own_token(self):
        """Sign-out removes the caller's token; another user's DELETE can't remove it."""
        from apps.notifications.models import FCMToken
        FCMToken.objects.create(user=self.alice, token=EXPO_TOKEN)
        self.api.force_authenticate(self.bob)
        self.assertEqual(self.api.delete(self.URL, {'token': EXPO_TOKEN}, format='json').status_code, 204)
        self.assertTrue(FCMToken.objects.exists())
        self.api.force_authenticate(self.alice)
        self.api.delete(self.URL, {'token': EXPO_TOKEN}, format='json')
        self.assertFalse(FCMToken.objects.exists())


class ExpoPushSenderTests(TestCase):
    """apps.notifications.push.send_push against a mocked Expo API."""

    def setUp(self):
        """A user with one registered device."""
        from apps.notifications.models import FCMToken
        self.user = User.objects.create_user(username='u', email='u@example.com', password='x')
        FCMToken.objects.create(user=self.user, token=EXPO_TOKEN)

    def test_message_format(self):
        """POSTs to exp.host with title/body/data on the 'default' Android channel, no auth header by default."""
        from apps.notifications.push import EXPO_PUSH_URL, send_push
        with mock.patch('apps.notifications.push.requests.post', return_value=expo_response(OK_TICKET)) as post:
            self.assertEqual(send_push(self.user, 'T', 'B', {'kind': 'tender'}), 1)
        self.assertEqual(post.call_args.args[0], EXPO_PUSH_URL)
        [message] = post.call_args.kwargs['json']
        self.assertEqual(message['to'], EXPO_TOKEN)
        self.assertEqual((message['title'], message['body'], message['data']), ('T', 'B', {'kind': 'tender'}))
        self.assertEqual(message['channelId'], 'default')
        self.assertNotIn('Authorization', post.call_args.kwargs['headers'])

    def test_batches_of_100(self):
        """Expo accepts at most 100 messages per request."""
        from apps.notifications.models import FCMToken
        from apps.notifications.push import send_push
        FCMToken.objects.bulk_create(
            FCMToken(user=self.user, token=f'ExponentPushToken[{i:022d}]') for i in range(149)
        )  # 150 devices in total
        with mock.patch('apps.notifications.push.requests.post',
                        side_effect=lambda url, json, **kw: expo_response(*[OK_TICKET] * len(json))) as post:
            self.assertEqual(send_push(self.user, 'T', 'B'), 150)
        self.assertEqual([len(c.kwargs['json']) for c in post.call_args_list], [100, 50])

    def test_unregistered_device_token_is_deleted(self):
        """A DeviceNotRegistered ticket removes the token so it isn't used again."""
        from apps.notifications.models import FCMToken
        from apps.notifications.push import send_push
        with mock.patch('apps.notifications.push.requests.post', return_value=expo_response(GONE_TICKET)):
            self.assertEqual(send_push(self.user, 'T', 'B'), 0)
        self.assertFalse(FCMToken.objects.exists())

    def test_network_failure_is_logged_not_raised(self):
        """Expo being unreachable doesn't raise into the alert run."""
        import requests
        from apps.notifications.push import send_push
        with mock.patch('apps.notifications.push.requests.post', side_effect=requests.ConnectionError('down')), \
                self.assertLogs('apps.notifications.push', level='ERROR'):
            self.assertEqual(send_push(self.user, 'T', 'B'), 0)

    @override_settings(PUSH_NOTIFICATIONS_ENABLED=False)
    def test_disabled(self):
        """PUSH_NOTIFICATIONS_ENABLED=False sends nothing."""
        from apps.notifications.push import send_push
        with mock.patch('apps.notifications.push.requests.post') as post:
            self.assertEqual(send_push(self.user, 'T', 'B'), 0)
        post.assert_not_called()


@override_settings(FRONTEND_URL='https://stepsdoor.in')
class AlertPushTests(TestCase):
    """Push alongside (or instead of) the email digest."""

    def setUp(self):
        """A tender alert from yesterday and one matching tender created now."""
        self.user = User.objects.create_user(username='firm', email='firm@example.com', password='x')
        backdate(TenderAlert.objects.create(user=self.user, keyword='road'),
                 created_at=timezone.now() - timedelta(days=1))
        self.tender = self.make_tender('2026_HRY_1_1', 'Road repair Ward 8')

    @staticmethod
    def make_tender(tender_id, title):
        """An active Haryana tender created now."""
        return Tender.objects.create(
            source_portal='etenders.hry.nic.in', tender_id=tender_id, title=title, organisation='MC Karnal',
            state='Haryana', published_at=timezone.now(), source_url='https://etenders.hry.nic.in/nicgep/app',
        )

    def register_device(self):
        """Give the alert owner a registered phone."""
        from apps.notifications.models import FCMToken
        FCMToken.objects.create(user=self.user, token=EXPO_TOKEN)

    def test_email_and_push(self):
        """A user with email and a device gets both; a single match carries its id for the tap."""
        self.register_device()
        with mock.patch('apps.notifications.push.requests.post', return_value=expo_response(OK_TICKET)) as post:
            counts = match_tender_alerts()
        self.assertEqual((counts['users_emailed'], counts['users_pushed']), (1, 1))
        [message] = post.call_args.kwargs['json']
        self.assertEqual(message['title'], '1 new tender match')
        self.assertEqual(message['body'], 'Road repair Ward 8')
        self.assertEqual(message['data'], {'type': 'alert_digest', 'kind': 'tender', 'count': 1, 'id': self.tender.pk})

    def test_push_only_user_is_reached(self):
        """No email address but the app installed → push only, and the alert advances."""
        User.objects.filter(pk=self.user.pk).update(email='')
        self.register_device()
        with mock.patch('apps.notifications.push.requests.post', return_value=expo_response(OK_TICKET)):
            counts = match_tender_alerts()
        self.assertEqual((counts['users_emailed'], counts['users_pushed'], counts['listings_sent']), (0, 1, 1))
        self.assertEqual(mail.outbox, [])
        self.assertIsNotNone(TenderAlert.objects.get().last_checked_at)

    def test_failed_email_skips_push_until_retry(self):
        """If the email fails, nothing is pushed either — the retry next run sends both once."""
        self.register_device()
        with mock.patch('django.core.mail.EmailMultiAlternatives.send', side_effect=OSError('down')), \
                mock.patch('apps.notifications.push.requests.post') as post, \
                self.assertLogs('apps.notifications.alert_emails', level='ERROR'):
            match_tender_alerts()
        post.assert_not_called()

    def test_several_matches_open_the_list(self):
        """With 2+ matches the payload has no id, so the app opens the list."""
        self.make_tender('2026_HRY_2_1', 'Road widening')
        self.register_device()
        with mock.patch('apps.notifications.push.requests.post', return_value=expo_response(OK_TICKET)) as post:
            match_tender_alerts()
        [message] = post.call_args.kwargs['json']
        self.assertEqual(message['title'], '2 new tender matches')
        self.assertTrue(message['body'].endswith(' and 1 more'))
        self.assertIsNone(message['data']['id'])

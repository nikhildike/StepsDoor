"""Tests for the job seeker features that span every kind of job.

- Saved jobs: StepsDoor posts, company careers jobs and govt jobs can all be
  saved (idempotently), and are listed with the same display fields.
- Job alerts: `/api/alerts/{id}/matches/` and `/api/alerts/matches/` list the
  open jobs matching an alert's keyword/city across the three sources.
- Dashboard stats: `/api/jobseekers/stats/` (saved, active alerts, matches,
  new jobs today since midnight IST).
"""
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.alerts.models import JobAlert
from apps.careers.models import CareerJob, CareerSource
from apps.companies.models import Company
from apps.govtjobs.models import GovtJob
from apps.jobs.models import JobPost
from apps.jobseekers.listings import new_today_counts, start_of_today_ist
from apps.jobseekers.models import JobSeeker, SavedJob

User = get_user_model()


class SeekerJobsTestCase(TestCase):
    """One of each kind of job (plus a closed one) and a signed-in job seeker."""

    def setUp(self):
        now = timezone.now()
        owner = User.objects.create_user(username='corp', email='hr@corp.example', password='x', is_company=True)
        company = Company.objects.create(user=owner, name='Nimbus Labs', contact_email='hr@corp.example')
        self.post = JobPost.objects.create(
            company=company, title='React Developer', description='Build dashboards.', location='HSR Layout',
            city='Bengaluru', job_type='full_time', salary_min=600000, salary_max=900000,
            redirect_url='https://nimbus.example/careers/react')
        source = CareerSource.objects.create(company_name='Razorpay', careers_url='https://razorpay.com/jobs',
                                             ats='greenhouse', ats_slug='razorpay')
        self.career = CareerJob.objects.create(
            source=source, external_id='1', title='Senior React Developer', location='Bangalore, Karnataka',
            cities='|Bengaluru|', apply_url='https://boards.greenhouse.io/razorpay/jobs/1', last_seen_at=now, posted_at=now)
        self.career_pune = CareerJob.objects.create(
            source=source, external_id='2', title='Data Analyst', location='Pune', cities='|Pune|',
            apply_url='https://boards.greenhouse.io/razorpay/jobs/2', last_seen_at=now, posted_at=now)
        self.govt = GovtJob.objects.create(
            source_portal='upsc.gov.in', job_id='advt:13/2026', title='Junior Developer (React)', organisation='UPSC',
            published_at=now, source_url='https://upsc.gov.in/advertisements')
        self.closed = CareerJob.objects.create(
            source=source, external_id='3', title='React Developer Intern', location='Bengaluru', cities='|Bengaluru|',
            apply_url='https://boards.greenhouse.io/razorpay/jobs/3', last_seen_at=now, is_active=False)

        self.user = User.objects.create_user(username='asha', email='asha@example.com', password='x', is_job_seeker=True)
        self.api = APIClient()
        self.api.force_authenticate(self.user)

    def alert(self, **fields):
        """Create a job alert for the signed-in seeker."""
        seeker, _ = JobSeeker.objects.get_or_create(user=self.user)
        return JobAlert.objects.create(job_seeker=seeker, **fields)


class SavedJobTests(SeekerJobsTestCase):
    """Saving any kind of job."""

    def test_save_each_kind_and_list_them(self):
        """All three kinds save and come back with the same display fields."""
        for payload in ({'job_post': self.post.id}, {'career_job': self.career.id}, {'govt_job': self.govt.id}):
            self.assertEqual(self.api.post('/api/jobseekers/saved-jobs/', payload, format='json').status_code, 201)
        data = self.api.get('/api/jobseekers/saved-jobs/').data
        rows = {r['kind']: r for r in (data.get('results', data) if isinstance(data, dict) else data)}
        self.assertEqual(set(rows), {'job', 'company', 'govt'})
        self.assertEqual((rows['company']['job_title'], rows['company']['company_name'], rows['company']['city']),
                         ('Senior React Developer', 'Razorpay', 'Bengaluru'))
        self.assertEqual(rows['company']['redirect_url'], 'https://boards.greenhouse.io/razorpay/jobs/1')
        self.assertEqual((rows['govt']['company_name'], rows['govt']['city']), ('UPSC', 'Central Govt'))
        self.assertEqual((rows['job']['company_slug'], rows['job']['salary_min']), (self.post.company.slug, 600000))
        self.assertTrue(all(r['is_open'] for r in rows.values()))

    def test_saving_twice_returns_the_existing_bookmark(self):
        """A double tap doesn't error or duplicate: the second save answers 200 with the same id."""
        first = self.api.post('/api/jobseekers/saved-jobs/', {'career_job': self.career.id}, format='json')
        second = self.api.post('/api/jobseekers/saved-jobs/', {'career_job': self.career.id}, format='json')
        self.assertEqual((first.status_code, second.status_code), (201, 200))
        self.assertEqual(first.data['id'], second.data['id'])
        self.assertEqual(SavedJob.objects.count(), 1)

    def test_exactly_one_job_required(self):
        """Sending none or two job ids is a 400."""
        self.assertEqual(self.api.post('/api/jobseekers/saved-jobs/', {}, format='json').status_code, 400)
        both = {'job_post': self.post.id, 'govt_job': self.govt.id}
        self.assertEqual(self.api.post('/api/jobseekers/saved-jobs/', both, format='json').status_code, 400)

    def test_closed_job_stays_saved_but_shows_closed(self):
        """A saved company job that closes is still listed, with is_open False."""
        self.api.post('/api/jobseekers/saved-jobs/', {'career_job': self.career.id}, format='json')
        CareerJob.objects.filter(id=self.career.id).update(is_active=False)
        data = self.api.get('/api/jobseekers/saved-jobs/').data
        row = (data.get('results', data) if isinstance(data, dict) else data)[0]
        self.assertFalse(row['is_open'])

    def test_only_own_saved_jobs(self):
        """Another user's bookmarks are invisible."""
        self.api.post('/api/jobseekers/saved-jobs/', {'govt_job': self.govt.id}, format='json')
        other = APIClient()
        other.force_authenticate(User.objects.create_user(username='b', email='b@example.com', password='x'))
        data = other.get('/api/jobseekers/saved-jobs/').data
        self.assertEqual(len(data.get('results', data) if isinstance(data, dict) else data), 0)


class AlertMatchTests(SeekerJobsTestCase):
    """Jobs listed for a job alert, across all three sources."""

    def titles(self, data):
        """(kind, title) pairs of a matches response, sorted."""
        return sorted((r['kind'], r['title']) for r in data['results'])

    def test_keyword_searches_all_sources(self):
        """A keyword matches StepsDoor posts, company jobs and govt jobs; closed jobs are left out."""
        alert = self.alert(role_keyword='react developer')
        data = self.api.get(f'/api/alerts/{alert.id}/matches/').data
        self.assertEqual(self.titles(data), [
            ('company', 'Senior React Developer'), ('govt', 'Junior Developer (React)'), ('job', 'React Developer')])
        self.assertEqual((data['count'], data['counts']), (3, {'job': 1, 'company': 1, 'govt': 1}))

    def test_keyword_matches_employer_name(self):
        """Words may match the company/organisation instead of the title."""
        data = self.api.get(f'/api/alerts/{self.alert(role_keyword="razorpay").id}/matches/').data
        self.assertEqual(self.titles(data), [('company', 'Data Analyst'), ('company', 'Senior React Developer')])

    def test_city_uses_standard_names_and_skips_govt(self):
        """'Bangalore' finds Bengaluru jobs; govt jobs (no city) are left out of city alerts."""
        data = self.api.get(f'/api/alerts/{self.alert(role_keyword="react", city="Bangalore").id}/matches/').data
        self.assertEqual(self.titles(data), [('company', 'Senior React Developer'), ('job', 'React Developer')])

    def test_job_type_limits_to_stepsdoor_posts(self):
        """job_type/salary filters exist only on StepsDoor posts, so other sources drop out."""
        data = self.api.get(f'/api/alerts/{self.alert(role_keyword="react", job_type="full_time").id}/matches/').data
        self.assertEqual(self.titles(data), [('job', 'React Developer')])

    def test_all_matches_lists_each_job_once(self):
        """Overlapping active alerts list a job once; paused alerts don't count."""
        self.alert(role_keyword='react')
        self.alert(role_keyword='senior')
        self.alert(role_keyword='analyst', is_active=False)
        data = self.api.get('/api/alerts/matches/').data
        self.assertEqual(data['count'], 3)
        self.assertEqual(len(data['results']), 3)
        self.assertNotIn(('company', 'Data Analyst'), self.titles(data))

    def test_limit_and_other_users_alerts(self):
        """`?limit=` caps the list (not the count); another user's alert is a 404."""
        alert = self.alert()  # no filters: every open job
        data = self.api.get(f'/api/alerts/{alert.id}/matches/?limit=2').data
        self.assertEqual((data['count'], len(data['results'])), (4, 2))
        other = APIClient()
        other.force_authenticate(User.objects.create_user(username='b', email='b@example.com', password='x'))
        self.assertEqual(other.get(f'/api/alerts/{alert.id}/matches/').status_code, 404)


class StatsTests(SeekerJobsTestCase):
    """The dashboard's stat cards."""

    def test_stats(self):
        """Saved count, active alerts, unique alert matches and today's new open jobs."""
        self.api.post('/api/jobseekers/saved-jobs/', {'govt_job': self.govt.id}, format='json')
        self.alert(role_keyword='react')
        self.alert(role_keyword='analyst', is_active=False)
        data = self.api.get('/api/jobseekers/stats/').data
        self.assertEqual((data['saved_jobs'], data['active_alerts'], data['alert_matches']), (1, 1, 3))
        self.assertEqual(data['new_jobs_today'], {'job': 1, 'company': 2, 'govt': 1, 'total': 4})

    def test_new_today_starts_at_midnight_ist(self):
        """Jobs first seen before midnight India time don't count as new today."""
        before = start_of_today_ist() - timedelta(minutes=5)
        CareerJob.objects.filter(id=self.career_pune.id).update(first_seen_at=before)
        self.assertEqual(new_today_counts()['company'], 1)

    def test_requires_sign_in(self):
        """Guests get 401."""
        self.assertEqual(APIClient().get('/api/jobseekers/stats/').status_code, 401)


class KeywordSuggestionTests(SeekerJobsTestCase):
    """Role / Keyword autocomplete: phrases from open job titles."""

    def setUp(self):
        super().setUp()
        source = self.career.source
        now = timezone.now()
        for i, title in enumerate(['Data Engineer 4B', 'Senior Data Engineer', 'Data Analyst - Operations',
                                   'Manager I, Data Platform', 'Lead Data Engineer (Spark)']):
            CareerJob.objects.create(source=source, external_id=f'd{i}', title=title, apply_url=f'https://x.in/{i}',
                                     last_seen_at=now)
        CareerJob.objects.create(source=source, external_id='closed', title='Data Engineer Closed Role',
                                 apply_url='https://x.in/c', last_seen_at=now, is_active=False)

    def suggest(self, q):
        """Keywords (in order) suggested for `q` through the API."""
        response = self.api.get('/api/alerts/suggestions/', {'q': q})
        self.assertEqual(response.status_code, 200)
        return [(s['keyword'], s['count']) for s in response.data]

    def test_phrases_that_start_with_the_query_most_common_first(self):
        """Grade codes and closed jobs are ignored; phrases don't cross '-', ',' or '('."""
        self.assertEqual(self.suggest('data e')[:1], [('Data Engineer', 3)])
        suggestions = dict(self.suggest('data'))
        self.assertEqual(suggestions['Data'], 6)  # the 5 above + the base 'Data Analyst' job
        self.assertEqual(suggestions['Data Analyst'], 2)
        self.assertNotIn('Data Engineer 4B', suggestions)
        self.assertNotIn('Data Analyst Operations', suggestions)
        self.assertNotIn('Data Engineer Closed', suggestions)

    def test_searches_every_kind_of_job(self):
        """Titles of StepsDoor posts, company jobs and govt jobs all count."""
        self.assertIn(('React Developer', 2), self.suggest('react d'))  # StepsDoor post + company job
        self.assertIn(('Junior Developer', 1), self.suggest('junior'))  # govt job

    def test_short_queries_and_sign_in(self):
        """Under 2 characters gives nothing; guests get 401."""
        self.assertEqual(self.suggest('d'), [])
        self.assertEqual(APIClient().get('/api/alerts/suggestions/', {'q': 'data'}).status_code, 401)

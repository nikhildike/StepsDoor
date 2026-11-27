"""Tests for careers jobs: ATS adapters, `sync_source`, the members-only API and source import.

The ATS classifier itself is covered in `tests.py`. No test here makes a real
HTTP call: adapters get a fake fetcher and sync tests swap the adapter out.
"""
from datetime import datetime, timedelta, timezone as dt_timezone
from types import SimpleNamespace

from django.contrib.auth import get_user_model
from django.test import SimpleTestCase, TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from apps.careers import adapters
from apps.careers.adapters import JobData, is_india, parse_workday_posted, workday_location
from apps.careers.cities import decode_cities, encode_cities, extract_cities
from apps.careers.management.commands.import_career_sources import source_slug
from apps.careers.models import CareerJob, CareerSource
from apps.careers.sync import sync_source


class JsonFetcher:
    """Fake `PoliteFetcher` for adapters: GET URL -> JSON body, and a callable answering Workday POSTs."""

    def __init__(self, gets=None, post=None):
        self.gets, self.post, self.posts = gets or {}, post, []

    def get(self, url, **kwargs):
        """Return a 200 response with the JSON registered for `url` (404 when unknown)."""
        if url not in self.gets:
            return SimpleNamespace(status_code=404, json=lambda: {})
        return SimpleNamespace(status_code=200, json=lambda body=self.gets[url]: body)

    def post_json(self, url, payload):
        """Record the payload and answer with `self.post(payload)`."""
        self.posts.append(payload)
        return SimpleNamespace(status_code=200, json=lambda: self.post(payload))


class AdapterTests(SimpleTestCase):
    """Each ATS adapter keeps India jobs only and maps the feed's fields."""

    def test_is_india(self):
        """Indian cities/states and 'India' match; foreign places don't."""
        for loc in ['Bengaluru', 'Gurugram, Haryana', 'Remote - India', 'Navi Mumbai']:
            self.assertTrue(is_india(loc), loc)
        for loc in ['Singapore', 'Kuala Lumpur', 'London, UK', '']:
            self.assertFalse(is_india(loc), loc)

    def test_greenhouse(self):
        """Greenhouse jobs outside India are dropped; ids, URLs and dates are mapped."""
        f = JsonFetcher({'https://boards-api.greenhouse.io/v1/boards/acme/jobs': {'jobs': [
            {'id': 1, 'title': 'SDE II', 'absolute_url': 'https://x/1', 'location': {'name': 'Bengaluru'},
             'updated_at': '2026-11-20T10:00:00-05:00'},
            {'id': 2, 'title': 'Ops', 'absolute_url': 'https://x/2', 'location': {'name': 'Singapore'}},
        ]}})
        jobs = adapters.fetch_greenhouse(f, 'acme', 50)
        self.assertEqual([(j.external_id, j.title, j.location) for j in jobs], [('1', 'SDE II', 'Bengaluru')])
        self.assertEqual(jobs[0].posted_at, datetime(2026, 11, 20, 15, 0, tzinfo=dt_timezone.utc))

    def test_lever_uses_country_field(self):
        """Lever's `country: IN` counts as India even when the location text is vague."""
        f = JsonFetcher({'https://api.lever.co/v0/postings/acme?mode=json': [
            {'id': 'a', 'text': 'PM', 'hostedUrl': 'https://l/a', 'country': 'IN', 'createdAt': 1764000000000,
             'categories': {'location': 'Remote', 'team': 'Product', 'commitment': 'Full-time'}},
            {'id': 'b', 'text': 'AE', 'hostedUrl': 'https://l/b', 'country': 'US', 'categories': {'location': 'NYC'}},
        ]})
        jobs = adapters.fetch_lever(f, 'acme', 50)
        self.assertEqual([(j.external_id, j.department, j.employment_type) for j in jobs],
                         [('a', 'Product', 'Full-time')])

    def test_workday_applies_india_facet_and_pages(self):
        """Workday: the India country facet is applied and pages are read until a short page."""
        facets = [{'facetParameter': 'locationMainGroup', 'values': [
            {'facetParameter': 'locationCountry', 'values': [{'descriptor': 'India', 'id': 'IN123', 'count': 25}]}]}]

        def post(payload):
            if payload['limit'] == 1:
                return {'total': 25, 'facets': facets, 'jobPostings': []}
            n = 20 if payload['offset'] == 0 else 5
            return {'jobPostings': [{'title': f'Job {payload["offset"] + i}', 'locationsText': 'Pune',
                                     'externalPath': f'/job/Pune/Job_R{payload["offset"] + i}',
                                     'postedOn': 'Posted 3 Days Ago'} for i in range(n)]}

        f = JsonFetcher(post=post)
        jobs = adapters.fetch_workday(f, 'acme.wd3.myworkdayjobs.com/Ext', 100)
        self.assertEqual(len(jobs), 25)
        self.assertEqual(f.posts[1]['appliedFacets'], {'locationCountry': ['IN123']})
        self.assertEqual(jobs[0].external_id, 'R0')
        self.assertEqual(jobs[0].apply_url, 'https://acme.wd3.myworkdayjobs.com/Ext/job/Pune/Job_R0')
        self.assertTrue(jobs[0].posted_is_approx)

    def test_workday_respects_cap(self):
        """Paging stops once `max_jobs` jobs are collected."""
        def post(payload):
            if payload['limit'] == 1:
                return {'facets': []}
            return {'jobPostings': [{'title': 'J', 'locationsText': 'Chennai', 'externalPath': f'/job/J_{payload["offset"] + i}'}
                                    for i in range(20)]}
        f = JsonFetcher(post=post)
        self.assertEqual(len(adapters.fetch_workday(f, 'a.wd1.myworkdayjobs.com/S', 30)), 30)
        self.assertEqual(len(f.posts), 3)  # facet probe + 2 pages

    def test_workday_multi_location_uses_path(self):
        """Workday's bare "2 Locations" is replaced by the primary site from the job path."""
        self.assertEqual(workday_location('2 Locations', '/job/Gurugram-DDC1A/Senior-Manager_R1'), 'Gurugram DDC1A (+1 more)')
        self.assertEqual(workday_location('Pune', '/job/Pune/X_R2'), 'Pune')
        self.assertEqual(workday_location('3 Locations', ''), '3 Locations')

    def test_workday_posted_text(self):
        """Relative Workday dates become datetimes; unknown text gives None."""
        now = datetime(2026, 11, 27, tzinfo=dt_timezone.utc)
        self.assertEqual(parse_workday_posted('Posted Today', now), now)
        self.assertEqual(parse_workday_posted('Posted Yesterday', now), now - timedelta(days=1))
        self.assertEqual(parse_workday_posted('Posted 30+ Days Ago', now), now - timedelta(days=30))
        self.assertIsNone(parse_workday_posted('', now))

    def test_oracle_keeps_indian_requisitions(self):
        """Oracle: only `PrimaryLocationCountry == 'IN'` is kept, with the CandidateExperience apply URL."""
        host = 'x.fa.ocs.oraclecloud.com'
        url = (f'https://{host}/hcmRestApi/resources/latest/recruitingCEJobRequisitions?onlyData=true'
               f'&expand=requisitionList.secondaryLocations'
               f'&finder=findReqs;siteNumber=CX_1,limit=25,offset=0,sortBy=POSTING_DATES_DESC')
        f = JsonFetcher({url: {'items': [{'requisitionList': [
            {'Id': '11', 'Title': 'Dev', 'PostedDate': '2026-11-27', 'PrimaryLocationCountry': 'IN',
             'PrimaryLocation': 'Pune'},
            {'Id': '12', 'Title': 'Dev US', 'PrimaryLocationCountry': 'US'},
        ]}]}})
        jobs = adapters.fetch_oracle_hcm(f, f'{host}/CX_1', 50)
        self.assertEqual([j.external_id for j in jobs], ['11'])
        self.assertEqual(jobs[0].apply_url, f'https://{host}/hcmUI/CandidateExperience/en/sites/CX_1/job/11')

    def test_http_error_raises(self):
        """A non-200 feed raises AdapterError so the sync records a failure."""
        with self.assertRaises(adapters.AdapterError):
            adapters.fetch_greenhouse(JsonFetcher(), 'missing', 50)


class CityExtractionTests(SimpleTestCase):
    """Free-text ATS locations map to standard city names."""

    def test_real_location_strings(self):
        """Aliases, office addresses, multi-city text and state-only locations, as seen in real feeds."""
        cases = {
            'Bangalore, Karnataka, India': ['Bengaluru'],
            'BANGALORE METROPOLITAN AREA, KARNATAKA, India': ['Bengaluru'],
            '1401-G-India: Floor 1 to 12, Hafeezpet Phoenix, Hyderabad': ['Hyderabad'],
            '1401-G-India: GF, 2-4 , 22B, STPI, Gurgaon': ['Gurugram'],
            'INDIA - DELHI - New Delhi': ['Delhi'],
            'Navi Mumbai, india': ['Navi Mumbai'],
            'Greater Noida': ['Noida'],
            'Calicut, KERALA, India': ['Kozhikode'],
            'Bengaluru, Hyderabad, Pune': ['Bengaluru', 'Hyderabad', 'Pune'],
            'KARNATAKA, India': [],
            'India': [],
        }
        for location, expected in cases.items():
            with self.subTest(location=location):
                self.assertEqual(extract_cities(location), expected)

    def test_encoding_round_trip(self):
        """Cities are stored '|A|B|' (whole-name matching) and decode back; no cities -> ''."""
        self.assertEqual(encode_cities(['Pune', 'Navi Mumbai']), '|Pune|Navi Mumbai|')
        self.assertEqual(decode_cities('|Pune|Navi Mumbai|'), ['Pune', 'Navi Mumbai'])
        self.assertEqual(encode_cities([]), '')


def make_source(**kw):
    """Create a Greenhouse CareerSource with sensible defaults for tests."""
    defaults = dict(company_name='Acme', sector='Fintech', careers_url='https://acme.in/careers',
                    ats='greenhouse', ats_slug='acme')
    defaults.update(kw)
    return CareerSource.objects.create(**defaults)


@override_settings(CAREER_JOBS_MAX_PER_SOURCE=300)
class SyncTests(TestCase):
    """`sync_source` upserts, closes vanished jobs, and leaves jobs alone when a fetch fails."""

    def run_sync(self, source, jobs=None, error=None):
        """Run sync_source with the source's adapter replaced by one returning `jobs` (or raising `error`)."""
        def fake(fetcher, slug, max_jobs):
            if error:
                raise error
            return jobs
        original = adapters.ADAPTERS[source.ats]
        adapters.ADAPTERS[source.ats] = fake
        try:
            return sync_source(source, fetcher=object())
        finally:
            adapters.ADAPTERS[source.ats] = original

    def test_create_update_and_close(self):
        """New jobs are created, listed ones updated, unlisted ones deactivated."""
        src = make_source()
        r = self.run_sync(src, [JobData('1', 'A', 'https://a/1'), JobData('2', 'B', 'https://a/2')])
        self.assertEqual((r.created, r.updated, r.deactivated), (2, 0, 0))
        r = self.run_sync(src, [JobData('1', 'A renamed', 'https://a/1')])
        self.assertEqual((r.created, r.updated, r.deactivated), (0, 1, 1))
        self.assertEqual(CareerJob.objects.get(external_id='1').title, 'A renamed')
        self.assertFalse(CareerJob.objects.get(external_id='2').is_active)
        src.refresh_from_db()
        self.assertEqual((src.last_status, src.consecutive_failures), ('ok', 0))

    def test_reappearing_job_is_reactivated(self):
        """A job that vanishes and comes back is active again and keeps its first_seen_at."""
        src = make_source()
        self.run_sync(src, [JobData('1', 'A', 'https://a/1')])
        first_seen = CareerJob.objects.get(external_id='1').first_seen_at
        self.run_sync(src, [])
        self.run_sync(src, [JobData('1', 'A', 'https://a/1')])
        job = CareerJob.objects.get(external_id='1')
        self.assertEqual((job.is_active, job.first_seen_at), (True, first_seen))

    def test_cities_are_stored(self):
        """sync_source fills `cities` from the location text."""
        src = make_source()
        self.run_sync(src, [JobData('1', 'A', 'https://a/1', location='Gurgaon, Haryana')])
        self.assertEqual(CareerJob.objects.get(external_id='1').cities, '|Gurugram|')

    def test_failure_keeps_jobs(self):
        """A failed fetch records the error and doesn't deactivate anything."""
        src = make_source()
        self.run_sync(src, [JobData('1', 'A', 'https://a/1')])
        r = self.run_sync(src, error=adapters.AdapterError('Greenhouse: HTTP 500'))
        self.assertIn('HTTP 500', r.error)
        self.assertTrue(CareerJob.objects.get(external_id='1').is_active)
        src.refresh_from_db()
        self.assertEqual((src.last_status, src.consecutive_failures), ('failed', 1))

    def test_approximate_posted_at_is_kept(self):
        """Workday's relative date is stored on first sight and not shifted by later fetches."""
        src = make_source(ats='workday', ats_slug='a.wd1.myworkdayjobs.com/Ext')
        first = timezone.now() - timedelta(days=3)
        self.run_sync(src, [JobData('R1', 'A', 'https://a/1', posted_at=first, posted_is_approx=True)])
        self.run_sync(src, [JobData('R1', 'A', 'https://a/1', posted_at=timezone.now(), posted_is_approx=True)])
        self.assertEqual(CareerJob.objects.get(external_id='R1').posted_at, first)


class CareerJobApiTests(TestCase):
    """`/api/careers/jobs/` is members-only and filters by company, sector and search."""

    def setUp(self):
        now = timezone.now()
        self.acme = make_source()
        self.beta = make_source(company_name='Beta', sector='IT & Software', ats='lever', ats_slug='beta')
        off = make_source(company_name='Gone', ats_slug='gone', is_active=False)
        for src, title, active, cities in [(self.acme, 'Backend Engineer', True, '|Pune|Navi Mumbai|'),
                                           (self.acme, 'Closed role', False, '|Pune|'),
                                           (self.beta, 'Data Analyst', True, '|Navi Mumbai|'),
                                           (off, 'Hidden', True, '|Pune|')]:
            CareerJob.objects.create(source=src, external_id=title, title=title, location='Pune', cities=cities,
                                     apply_url='https://x.in/' + title.replace(' ', ''),
                                     last_seen_at=now, is_active=active, posted_at=now)
        user = get_user_model().objects.create_user(username='s', email='s@example.com', password='x',
                                                    is_job_seeker=True)
        self.member = APIClient()
        self.member.force_authenticate(user)

    def titles(self, resp):
        """Sorted titles in a paginated list response."""
        return sorted(j['title'] for j in resp.data['results'])

    def test_anonymous_gets_401(self):
        """Guests can't read the list (the web client shows MembersOnly instead)."""
        self.assertEqual(APIClient().get('/api/careers/jobs/').status_code, 401)

    def test_lists_active_jobs_of_active_sources(self):
        """Closed jobs and jobs of switched-off companies are hidden; company fields are included."""
        resp = self.member.get('/api/careers/jobs/')
        self.assertEqual(self.titles(resp), ['Backend Engineer', 'Data Analyst'])
        self.assertIn(resp.data['results'][0]['company_name'], ('Acme', 'Beta'))

    def test_filters(self):
        """company, sector and search narrow the list."""
        self.assertEqual(self.titles(self.member.get(f'/api/careers/jobs/?company={self.beta.id}')), ['Data Analyst'])
        self.assertEqual(self.titles(self.member.get('/api/careers/jobs/?sector=Fintech')), ['Backend Engineer'])
        self.assertEqual(self.titles(self.member.get('/api/careers/jobs/?search=analyst')), ['Data Analyst'])

    def test_city_filter_matches_whole_names(self):
        """`city=Mumbai` doesn't match 'Navi Mumbai'; a job in two cities appears under both."""
        self.assertEqual(self.titles(self.member.get('/api/careers/jobs/?city=Pune')), ['Backend Engineer'])
        self.assertEqual(self.titles(self.member.get('/api/careers/jobs/?city=Navi Mumbai')),
                         ['Backend Engineer', 'Data Analyst'])
        self.assertEqual(self.titles(self.member.get('/api/careers/jobs/?city=Mumbai')), [])
        self.assertIn(self.member.get('/api/careers/jobs/').data['results'][0]['cities'],
                      (['Pune', 'Navi Mumbai'], ['Navi Mumbai']))

    def test_cities_action(self):
        """Open jobs per city, busiest first; closed jobs and switched-off companies don't count."""
        data = self.member.get('/api/careers/jobs/cities/').data
        self.assertEqual(data, [{'city': 'Navi Mumbai', 'count': 2}, {'city': 'Pune', 'count': 1}])

    def test_companies_action(self):
        """The companies list counts active jobs and omits companies with none."""
        data = self.member.get('/api/careers/jobs/companies/').data
        self.assertEqual(sorted((c['company_name'], c['job_count']) for c in data), [('Acme', 1), ('Beta', 1)])


class ImportSlugTests(SimpleTestCase):
    """`import_career_sources` recovers the slug format each adapter expects."""

    def test_slugs(self):
        """Workday -> host/site without locale; Oracle -> host/site (CX_1 default); unsupported -> None."""
        self.assertEqual(source_slug({'ats': 'workday', 'ats_slug': 'x',
                                      'evidence': 'https://acc.wd103.myworkdayjobs.com/en-US/AccentureCareers'}),
                         'acc.wd103.myworkdayjobs.com/AccentureCareers')
        self.assertEqual(source_slug({'ats': 'oracle_hcm', 'ats_slug': 'x',
                                      'evidence': 'fa-x.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience'}),
                         'fa-x.fa.ocs.oraclecloud.com/CX_1')
        self.assertEqual(source_slug({'ats': 'oracle_hcm', 'final_url':
                                      'https://e.fa.us2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_2/jobs'}),
                         'e.fa.us2.oraclecloud.com/CX_2')
        self.assertEqual(source_slug({'ats': 'greenhouse', 'ats_slug': 'razorpay'}), 'razorpay')
        self.assertIsNone(source_slug({'ats': 'darwinbox', 'ats_slug': 'bigbasket'}))

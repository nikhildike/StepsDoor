"""
Tests for job posting permissions in apps.jobs.views.JobPostViewSet: who may post
(companies and contractors), how a contractor's company is created, and that only
a job's owner can edit, pause/reactivate or delete it.
"""
from django.test import TestCase
from rest_framework.test import APIClient

from apps.authentication.models import User
from apps.companies.models import Company
from apps.jobs.models import JobPost
from apps.tenders.models import ContractorProfile

JOB = {
    'title': 'Site Engineer (Civil)',
    'description': 'Supervise road and drainage works for municipal contracts in Haryana.',
    'location': 'Sector 9', 'city': 'Karnal', 'job_type': 'full_time',
    'redirect_url': 'https://acme-infra.example/careers',
}


class JobPostingTests(TestCase):
    """POST/PATCH/DELETE /api/jobs/ for each account type."""

    def setUp(self):
        """A contractor firm, a company, a job seeker and an API client."""
        self.contractor = User.objects.create_user(username='firm', email='hr@acme-infra.example',
                                                   password='x', is_contractor=True)
        ContractorProfile.objects.create(user=self.contractor, firm_name='Acme Infra Pvt Ltd',
                                         gstin='06ABCDE1234F1Z5', contact_email='hr@acme-infra.example')
        self.company_user = User.objects.create_user(username='corp', email='hr@corp.example', password='x', is_company=True)
        Company.objects.create(user=self.company_user, name='Corp', contact_email='hr@corp.example')
        self.seeker = User.objects.create_user(username='ravi', email='ravi@example.com', password='x', is_job_seeker=True)
        self.api = APIClient()

    def post_as(self, user, data=JOB):
        """POST a job as `user`."""
        self.api.force_authenticate(user)
        return self.api.post('/api/jobs/', data, format='json')

    def test_contractor_first_post_creates_firm_company(self):
        """A contractor can post; the job belongs to a company named after the firm, reused next time."""
        response = self.post_as(self.contractor)
        self.assertEqual(response.status_code, 201, response.data)
        company = Company.objects.get(user=self.contractor)
        self.assertEqual((company.name, company.gst_number), ('Acme Infra Pvt Ltd', '06ABCDE1234F1Z5'))
        self.assertTrue(company.slug)  # public careers page /careers/<slug>
        self.assertEqual(JobPost.objects.get().company, company)

        self.assertEqual(self.post_as(self.contractor).status_code, 201)
        self.assertEqual(Company.objects.filter(user=self.contractor).count(), 1)
        self.contractor.refresh_from_db()
        self.assertTrue(self.contractor.is_contractor)
        self.assertFalse(self.contractor.is_company)  # stays a contractor account

    def test_company_can_post_and_seeker_cannot(self):
        """Companies post as before; job seekers get 403 (not a 500)."""
        self.assertEqual(self.post_as(self.company_user).status_code, 201)
        self.assertEqual(self.post_as(self.seeker).status_code, 403)
        self.api.force_authenticate(None)
        self.assertEqual(self.api.post('/api/jobs/', JOB, format='json').status_code, 401)

    def test_only_the_owner_can_edit_or_delete(self):
        """Another signed-in user can't change or delete someone else's job."""
        job_id = self.post_as(self.contractor).data['id']
        self.api.force_authenticate(self.company_user)
        self.assertEqual(self.api.patch(f'/api/jobs/{job_id}/', {'title': 'Hijacked'}, format='json').status_code, 404)
        self.assertEqual(self.api.delete(f'/api/jobs/{job_id}/').status_code, 404)
        self.assertEqual(JobPost.objects.get(pk=job_id).title, JOB['title'])

    def test_owner_can_pause_and_reactivate(self):
        """Deactivating hides the job publicly; the owner can switch it back on."""
        job_id = self.post_as(self.contractor).data['id']
        self.assertEqual(self.api.patch(f'/api/jobs/{job_id}/', {'is_active': False}, format='json').status_code, 200)
        self.api.force_authenticate(None)
        self.assertEqual(self.api.get(f'/api/jobs/{job_id}/').status_code, 404)  # hidden from the public
        self.api.force_authenticate(self.contractor)
        self.assertEqual(self.api.patch(f'/api/jobs/{job_id}/', {'is_active': True}, format='json').status_code, 200)
        self.assertTrue(JobPost.objects.get(pk=job_id).is_active)

    def test_my_jobs_lists_the_contractors_posts(self):
        """The contractor's My Jobs page lists their posts, inactive ones included."""
        job_id = self.post_as(self.contractor).data['id']
        JobPost.objects.filter(pk=job_id).update(is_active=False)
        self.post_as(self.company_user)
        self.api.force_authenticate(self.contractor)
        self.assertEqual([j['id'] for j in self.api.get('/api/jobs/my/').data], [job_id])

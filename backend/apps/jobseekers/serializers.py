"""DRF serializers for the `jobseekers` app.

Converts `JobSeeker` and `SavedJob` model instances to/from JSON for
the job-seeker profile and saved-jobs API endpoints.
"""
from rest_framework import serializers

from .models import JobSeeker, SavedJob


class JobSeekerSerializer(serializers.ModelSerializer):
    """Serializes a job seeker's profile, including a few fields from the linked User.

    Used by `JobSeekerViewSet` (including the `me` action) to display
    and update the seeker's own profile page — name/email come from
    the underlying `User` account, while `phone` lives on this model.
    """
    first_name = serializers.CharField(source='user.first_name', read_only=True)  # Pulled from the linked User; updated separately in the `me` view, not via this serializer
    last_name = serializers.CharField(source='user.last_name', read_only=True)  # Pulled from the linked User; updated separately in the `me` view, not via this serializer
    email = serializers.EmailField(source='user.email', read_only=True)  # Pulled from the linked User; read-only since email changes go through auth flows

    class Meta:
        model = JobSeeker
        fields = ['id', 'phone', 'created_at', 'first_name', 'last_name', 'email']
        # `created_at` is system-set on creation; `id` is the DB primary key
        read_only_fields = ['id', 'created_at']


class SavedJobSerializer(serializers.ModelSerializer):
    """A saved job of any kind, with the job's key details flattened in.

    Used by `SavedJobViewSet`. To save, the client sends exactly one of
    `job_post` (StepsDoor post id), `career_job` (company careers job id) or
    `govt_job` (government job id). Reads return the same display fields for
    every kind (from `apps.jobseekers.listings.describe`), so the Saved Jobs
    page renders them the same way.
    """
    kind = serializers.CharField(read_only=True)  # 'job' | 'company' | 'govt'
    job_title = serializers.SerializerMethodField()  # Job title
    company_name = serializers.SerializerMethodField()  # Employer / recruiting organisation
    city = serializers.SerializerMethodField()  # Where the job is (city list for company jobs, state for govt jobs)
    redirect_url = serializers.SerializerMethodField()  # Where to apply (company page / official notice)
    deadline = serializers.SerializerMethodField()  # Last date to apply, when known
    is_open = serializers.SerializerMethodField()  # False once the job is closed, expired or removed from its source
    # StepsDoor posts only (null for other kinds):
    company_slug = serializers.CharField(source='job_post.company.slug', read_only=True, default=None)  # For the company's StepsDoor careers page
    job_type = serializers.CharField(source='job_post.job_type', read_only=True, default=None)  # Employment type enum
    salary_min = serializers.IntegerField(source='job_post.salary_min', read_only=True, default=None)  # Lower salary bound
    salary_max = serializers.IntegerField(source='job_post.salary_max', read_only=True, default=None)  # Upper salary bound

    class Meta:
        model = SavedJob
        fields = [
            'id', 'kind', 'job_post', 'career_job', 'govt_job', 'saved_at',
            'job_title', 'company_name', 'company_slug', 'city', 'job_type',
            'salary_min', 'salary_max', 'redirect_url', 'deadline', 'is_open',
        ]
        # `job_seeker` is never taken from client input — it's set server-side in
        # perform_create from the authenticated user, so a seeker can only save jobs to their own list.
        read_only_fields = ['id', 'saved_at', 'job_seeker']
        # Uniqueness per seeker is handled by SavedJobViewSet.create (returns the existing bookmark).
        validators = []

    def validate(self, attrs):
        """Require exactly one of `job_post` / `career_job` / `govt_job`."""
        given = [f for f in ('job_post', 'career_job', 'govt_job') if attrs.get(f)]
        if len(given) != 1:
            raise serializers.ValidationError('Send exactly one of job_post, career_job or govt_job.')
        return attrs

    def _job(self, saved):
        """The saved job object, whichever kind it is."""
        return saved.job_post or saved.career_job or saved.govt_job

    def _described(self, saved):
        """`describe()` output for the saved job, computed once per object."""
        cache = getattr(saved, '_described', None)
        if cache is None:
            from .listings import describe
            cache = describe(saved.kind, self._job(saved))
            saved._described = cache
        return cache

    def get_job_title(self, saved):
        """Title of the saved job."""
        return self._described(saved)['title']

    def get_company_name(self, saved):
        """Employer or recruiting organisation."""
        return self._described(saved)['company']

    def get_city(self, saved):
        """Location text shown on the card."""
        return self._described(saved)['location']

    def get_redirect_url(self, saved):
        """Where the seeker applies."""
        return self._described(saved)['apply_url']

    def get_deadline(self, saved):
        """Last date to apply, if the source gives one (ISO string or None)."""
        value = self._described(saved)['deadline']
        return value.isoformat() if value else None

    def get_is_open(self, saved):
        """Whether the job can still be applied for."""
        from django.utils import timezone
        job, now = self._job(saved), timezone.now()
        if saved.kind == 'job':
            return job.is_active and (job.expires_at is None or job.expires_at > now)
        if saved.kind == 'company':
            return job.is_active and job.source.is_active
        return job.is_active and (job.application_deadline is None or job.application_deadline > now)

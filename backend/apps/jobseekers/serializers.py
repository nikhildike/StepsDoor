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
    """Serializes a saved-job bookmark with the underlying job post's key details flattened in.

    Used by `SavedJobViewSet` so the Saved Jobs list/page can render
    job title, company, and salary without the client having to make
    a second request per bookmark to fetch the related `JobPost`.
    """
    job_title = serializers.CharField(source='job_post.title', read_only=True)  # Denormalized from the saved JobPost for display
    company_name = serializers.CharField(source='job_post.company.name', read_only=True)  # Denormalized company name, avoids an extra lookup
    company_slug = serializers.CharField(source='job_post.company.slug', read_only=True)  # Denormalized company slug, for linking to the company profile
    city = serializers.CharField(source='job_post.city', read_only=True)  # Denormalized job city for display
    job_type = serializers.CharField(source='job_post.job_type', read_only=True)  # Denormalized employment type for display
    salary_min = serializers.IntegerField(source='job_post.salary_min', read_only=True)  # Denormalized lower salary bound for display
    salary_max = serializers.IntegerField(source='job_post.salary_max', read_only=True)  # Denormalized upper salary bound for display
    redirect_url = serializers.URLField(source='job_post.redirect_url', read_only=True)  # Denormalized careers-page URL so "Apply" works directly from the saved jobs list

    class Meta:
        model = SavedJob
        fields = [
            'id', 'job_post', 'saved_at',
            'job_title', 'company_name', 'company_slug',
            'city', 'job_type', 'salary_min', 'salary_max', 'redirect_url',
        ]
        # `job_seeker` is never taken from client input — it's set server-side in
        # perform_create from the authenticated user, so a seeker can only save jobs to their own list.
        read_only_fields = ['id', 'saved_at', 'job_seeker']

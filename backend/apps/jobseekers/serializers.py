from rest_framework import serializers

from .models import JobSeeker, SavedJob


class JobSeekerSerializer(serializers.ModelSerializer):
    first_name = serializers.CharField(source='user.first_name', read_only=True)
    last_name = serializers.CharField(source='user.last_name', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)

    class Meta:
        model = JobSeeker
        fields = ['id', 'phone', 'created_at', 'first_name', 'last_name', 'email']
        read_only_fields = ['id', 'created_at']


class SavedJobSerializer(serializers.ModelSerializer):
    job_title = serializers.CharField(source='job_post.title', read_only=True)
    company_name = serializers.CharField(source='job_post.company.name', read_only=True)
    company_slug = serializers.CharField(source='job_post.company.slug', read_only=True)
    city = serializers.CharField(source='job_post.city', read_only=True)
    job_type = serializers.CharField(source='job_post.job_type', read_only=True)
    salary_min = serializers.IntegerField(source='job_post.salary_min', read_only=True)
    salary_max = serializers.IntegerField(source='job_post.salary_max', read_only=True)
    redirect_url = serializers.URLField(source='job_post.redirect_url', read_only=True)

    class Meta:
        model = SavedJob
        fields = [
            'id', 'job_post', 'saved_at',
            'job_title', 'company_name', 'company_slug',
            'city', 'job_type', 'salary_min', 'salary_max', 'redirect_url',
        ]
        read_only_fields = ['id', 'saved_at', 'job_seeker']

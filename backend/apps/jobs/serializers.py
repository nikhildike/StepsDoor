"""DRF serializers for the `jobs` app.

Converts `JobPost` model instances to/from JSON for the public job
listing API and the company dashboard (create/edit job) API.
"""
from rest_framework import serializers
from .models import JobPost


class JobPostSerializer(serializers.ModelSerializer):
    """Serializes `JobPost` for both public listing views and company management views.

    Used by `JobPostViewSet` for list/retrieve (job seekers browsing
    listings) as well as create/update (company posting/editing a
    job). Flattens a few company fields onto the payload so clients
    don't need a second request to show company name/logo alongside
    each listing.
    """
    company_name = serializers.CharField(source='company.name', read_only=True)  # Denormalized company name for display without a separate lookup
    company_slug = serializers.CharField(source='company.slug', read_only=True)  # Denormalized company slug for linking to the company's public profile
    company_logo = serializers.ImageField(source='company.logo', read_only=True)  # Denormalized company logo for display in job listing cards

    class Meta:
        model = JobPost
        fields = '__all__'
        # `clicks` and `created_at` are system-managed (see track_click / auto_now_add);
        # `company` is set server-side from the authenticated user in perform_create,
        # never accepted from client input, to prevent posting jobs under another company.
        read_only_fields = ['id', 'clicks', 'created_at', 'company']

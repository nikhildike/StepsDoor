"""DRF serializers for the `alerts` app, used by JobAlertViewSet to
(de)serialize JobAlert records for the /api/alerts/ endpoints."""

from rest_framework import serializers

from .models import JobAlert


class JobAlertSerializer(serializers.ModelSerializer):
    """Serializes JobAlert for list/create/retrieve/update/destroy via
    JobAlertViewSet. Used by the seeker-facing Alerts screen (web and
    mobile) to let a job seeker manage their saved alert criteria."""
    class Meta:
        model = JobAlert
        fields = '__all__'  # expose all model fields, including city/role_keyword/job_type/salary_min/is_active
        # id/created_at are server-managed; job_seeker is set server-side in
        # JobAlertViewSet.perform_create from the authenticated user, never from client input.
        read_only_fields = ['id', 'created_at', 'job_seeker']

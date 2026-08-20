"""DRF serializers for the `analytics` app, used by JobClickViewSet to
(de)serialize JobClick records for the /api/analytics/clicks/ endpoints."""

from rest_framework import serializers

from .models import JobClick


class JobClickSerializer(serializers.ModelSerializer):
    """Serializes JobClick for list/create/retrieve via JobClickViewSet.
    Used both to record a new click event (e.g. from a public job
    redirect/apply action) and to return click data to the company
    analytics dashboard."""
    class Meta:
        model = JobClick
        fields = '__all__'  # expose all model fields, including job_post/ip_address/user_agent/clicked_at
        read_only_fields = ['id', 'clicked_at']  # clicked_at is server-set (auto_now_add); id is DB-assigned

"""
Serializers for the `govtjobs` app.

Converts `GovtJob` and `GovtJobAlert` model instances to/from JSON for the
public read-only govt jobs API and the authenticated alerts API in
`views.py`.
"""
from rest_framework import serializers
from .models import GovtJob, GovtJobAlert


class GovtJobListSerializer(serializers.ModelSerializer):
    """Compact serializer used for the public govt job listing/search page.

    Excludes the internal `search_vector` field and omits fields not needed
    in a list view.
    """
    class Meta:
        model = GovtJob
        fields = [
            'id', 'job_id', 'title', 'organisation', 'state', 'category',
            'qualification', 'vacancy_count', 'age_limit', 'salary_range',
            'application_start', 'application_deadline', 'exam_date',
            'published_at', 'source_url', 'notification_pdf_url',
            'source_portal', 'is_active',
        ]


class GovtJobDetailSerializer(serializers.ModelSerializer):
    """Full serializer for a single govt job's detail page.

    Exposes every model field except the internal `search_vector` (which is
    only used for PostgreSQL full-text search and has no meaning to clients).
    """
    class Meta:
        model = GovtJob
        exclude = ['search_vector']


class GovtJobAlertSerializer(serializers.ModelSerializer):
    """Serializes a job seeker's saved govt job alert.

    Used by `GovtJobAlertViewSet` for the authenticated create/list/update/
    delete API a user hits to manage their own alerts.
    """
    class Meta:
        model = GovtJobAlert
        fields = ['id', 'keyword', 'state', 'category', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']

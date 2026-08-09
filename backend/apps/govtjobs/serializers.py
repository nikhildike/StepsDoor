from rest_framework import serializers
from .models import GovtJob, GovtJobAlert


class GovtJobListSerializer(serializers.ModelSerializer):
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
    class Meta:
        model = GovtJob
        exclude = ['search_vector']


class GovtJobAlertSerializer(serializers.ModelSerializer):
    class Meta:
        model = GovtJobAlert
        fields = ['id', 'keyword', 'state', 'category', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']

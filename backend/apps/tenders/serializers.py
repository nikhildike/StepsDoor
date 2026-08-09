from rest_framework import serializers
from .models import Tender, TenderAlert, ScraperLog


class TenderListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views."""

    class Meta:
        model = Tender
        fields = [
            'id', 'tender_id', 'reference_number', 'title', 'description', 'organisation', 'state', 'district',
            'category', 'estimated_value', 'document_fee', 'emd_amount',
            'submission_deadline', 'opening_date', 'published_at',
            'source_url', 'document_url', 'source_portal', 'is_active',
        ]


class TenderDetailSerializer(serializers.ModelSerializer):
    """Full serializer for detail views."""

    class Meta:
        model = Tender
        exclude = ['search_vector']


class TenderAlertSerializer(serializers.ModelSerializer):
    class Meta:
        model = TenderAlert
        fields = ['id', 'keyword', 'state', 'category', 'min_value', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']

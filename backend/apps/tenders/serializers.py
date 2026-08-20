"""
DRF serializers for the `tenders` app's public and authenticated API.

Used by `apps.tenders.views.TenderViewSet` (public, read-only tender browsing) and
`TenderAlertViewSet` (authenticated CRUD on a user's saved-search alerts). `ScraperLog` is
imported here but currently has no serializer — scrape-run status is admin-only, not exposed
via the API.
"""
from rest_framework import serializers
from .models import Tender, TenderAlert, ScraperLog


class TenderListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for list views.

    Used by `TenderViewSet.get_serializer_class()` for the `list` action — excludes the
    heavier/derived `search_vector` field and mirrors `TenderDetailSerializer`'s field set
    minus nothing extra, keeping the tenders listing endpoint payload small.
    """

    class Meta:
        model = Tender
        fields = [
            'id', 'tender_id', 'reference_number', 'title', 'description', 'organisation', 'state', 'district',
            'category', 'estimated_value', 'document_fee', 'emd_amount',
            'submission_deadline', 'opening_date', 'published_at',
            'source_url', 'document_url', 'source_portal', 'is_active',
        ]


class TenderDetailSerializer(serializers.ModelSerializer):
    """
    Full serializer for detail views.

    Used by `TenderViewSet.get_serializer_class()` for the `retrieve` action — includes
    every `Tender` field except `search_vector`, which is an internal Postgres full-text
    search artifact with no meaning to API consumers.
    """

    class Meta:
        model = Tender
        exclude = ['search_vector']


class TenderAlertSerializer(serializers.ModelSerializer):
    """
    Serializer for a job seeker's saved tender-search alert.

    Used by `TenderAlertViewSet` for list/create/update/delete of the current user's
    `TenderAlert` rows; `user` is deliberately not in `fields` since it's set server-side
    in `TenderAlertViewSet.perform_create()` from the authenticated request, not client input.
    """
    class Meta:
        model = TenderAlert
        fields = ['id', 'keyword', 'state', 'category', 'min_value', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']

"""Serializers for the `companies` app.

`CompanySerializer` is the full owner-facing representation used by the
company dashboard (create/view/edit own profile); `CompanyPublicSerializer`
is the trimmed, anonymous-safe representation used by the public company
directory and career page.
"""
from rest_framework import serializers

from .models import Company


class CompanySerializer(serializers.ModelSerializer):
    """Full `Company` representation for the owning company user.

    Used by `CompanyViewSet` (dashboard CRUD + the `me` action) and by
    `CompanyCareersView` to embed company details in the public career-page
    response. Exposes every model field, but `id`/`slug`/`created_at`/`user`
    are read-only since they're system-assigned rather than user-editable.
    """
    class Meta:
        model = Company
        fields = '__all__'
        read_only_fields = ['id', 'slug', 'created_at', 'user']


class CompanyPublicSerializer(serializers.ModelSerializer):
    """Trimmed, anonymous-safe `Company` representation for public browsing.

    Used by `CompanyPublicListView` (the public company directory). Omits
    verification IDs, contact email/phone, and other private fields that
    `CompanySerializer` exposes, and adds `active_job_count`, a value
    computed via annotation on the queryset (not a real model field) rather
    than validated here.
    """
    active_job_count = serializers.IntegerField(read_only=True)  # Populated from the `Count('jobs', ...)` annotation in CompanyPublicListView.get_queryset(), not stored on the model

    class Meta:
        model = Company
        fields = ['id', 'name', 'slug', 'logo', 'description', 'website', 'active_job_count']

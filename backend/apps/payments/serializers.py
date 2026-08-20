"""DRF serializers for the payments app."""

from rest_framework import serializers

from .models import Invoice, WebhookLog


class InvoiceSerializer(serializers.ModelSerializer):
    """Serializes `Invoice` records for the company-facing invoice list API.

    Used by `InvoiceViewSet` (read-only) so a logged-in company user can
    view/download their subscription billing history.
    """
    class Meta:
        model = Invoice
        fields = '__all__'
        read_only_fields = ['id', 'created_at']  # Server-generated fields; not settable via the API.


class WebhookLogSerializer(serializers.ModelSerializer):
    """Serializes `WebhookLog` records for the admin-only webhook log API.

    Used by `WebhookLogViewSet` so staff/admin tooling can inspect raw
    Razorpay webhook deliveries (event type, payload, processed status)
    when debugging subscription payment issues.
    """
    class Meta:
        model = WebhookLog
        fields = '__all__'
        read_only_fields = ['id', 'created_at']  # Server-generated fields; not settable via the API.

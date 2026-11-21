"""Serializers for the `services` app."""
from rest_framework import serializers

from .models import ServiceProvider


class ServiceProviderSerializer(serializers.ModelSerializer):
    """Read-only representation of a ServiceProvider for the public Services directory.

    Adds `category_display` (the human-readable label, e.g. "Plumber")
    alongside the raw `category` code, since the client needs a label to
    render on the card plus a stable code to filter on.
    """
    category_display = serializers.CharField(source='get_category_display', read_only=True)

    class Meta:
        model = ServiceProvider
        fields = [
            'id', 'name', 'category', 'category_display', 'description',
            'address', 'city', 'state', 'pincode',
            'phone', 'whatsapp', 'email', 'photo', 'created_at',
        ]

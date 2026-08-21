"""Serializers for the `stores` app.

Two serializers cover the read vs. write shape of a Store: `StoreSerializer`
is the full public/read representation, `StoreUpdateSerializer` is the
restricted set of fields a store owner may edit about their own store.
"""
from rest_framework import serializers
from .models import Store


class StoreSerializer(serializers.ModelSerializer):
    """Read-facing representation of a Store.

    Used for the public store listing/detail endpoints and to render the
    store owner's own profile in `MyStoreView` (GET). Includes the
    `has_active_subscription` model property so clients can render
    subscription-gated UI without a separate lookup.
    """
    # Pulled from the model's `has_active_subscription` property rather than a DB field;
    # read-only since it's derived, not settable.
    has_active_subscription = serializers.BooleanField(read_only=True)

    class Meta:
        model = Store
        fields = [
            'id', 'name', 'slug', 'logo', 'store_type', 'category',
            'website_url', 'store_locator_url', 'affiliate_url', 'affiliate_network',
            'description', 'tagline', 'shopping_links', 'offers_links',
            'contact_email', 'contact_phone',
            'is_active', 'has_active_subscription', 'created_at',
        ]
        # id/slug/created_at are server-controlled — slug is auto-generated in Store.save(),
        # id and created_at are assigned at creation and must never be client-writable.
        read_only_fields = ['id', 'slug', 'created_at']


class StoreUpdateSerializer(serializers.ModelSerializer):
    """Write-facing serializer for a store owner editing their own store.

    Used by `MyStoreView` on PUT/PATCH. Deliberately excludes fields the
    owner shouldn't self-manage — `is_active` (admin-controlled visibility),
    verification IDs (gst/pan/aadhar, set at registration), `contact_email`,
    server-derived fields like `slug`/`has_active_subscription`, and
    `shopping_links`/`offers_links` which are admin-only fields set directly
    via Django admin (these contain affiliate/offer links curated by StepsDoor,
    not user-submitted content).
    """
    class Meta:
        model = Store
        fields = [
            'name', 'logo', 'store_type', 'category',
            'website_url', 'store_locator_url', 'affiliate_url',
            'description', 'tagline', 'contact_phone',
        ]

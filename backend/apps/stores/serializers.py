from rest_framework import serializers
from .models import Store


class StoreSerializer(serializers.ModelSerializer):
    has_active_subscription = serializers.BooleanField(read_only=True)

    class Meta:
        model = Store
        fields = [
            'id', 'name', 'slug', 'logo', 'store_type', 'category',
            'website_url', 'store_locator_url',
            'description', 'tagline', 'contact_email', 'contact_phone',
            'is_active', 'has_active_subscription', 'created_at',
        ]
        read_only_fields = ['id', 'slug', 'created_at']


class StoreUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Store
        fields = [
            'name', 'logo', 'store_type', 'category',
            'website_url', 'store_locator_url',
            'description', 'tagline', 'contact_phone',
        ]

"""DRF serializers for the notifications app."""

from rest_framework import serializers

from .models import FCMToken


class FCMTokenSerializer(serializers.ModelSerializer):
    """Serializes/deserializes `FCMToken` for the FCM token registration API.

    Used by `FCMTokenViewSet` so an authenticated client can register (POST)
    or list/delete its own device tokens. `user` is read-only here because
    the view sets it from the authenticated request user (see
    `FCMTokenViewSet.perform_create`), never from client-supplied input.
    """
    class Meta:
        model = FCMToken
        fields = '__all__'
        # id/created_at are server-generated; user is force-set from the request
        # in the view rather than trusted from client input.
        read_only_fields = ['id', 'created_at', 'user']

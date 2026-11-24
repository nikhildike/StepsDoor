"""DRF serializers for the notifications app."""
from rest_framework import serializers


class PushTokenSerializer(serializers.Serializer):
    """
    Validates the body of POST /api/notifications/push-token/ (PushTokenView).

    Only Expo push tokens are accepted — the backend sends through Expo's push
    service, which can't deliver to raw FCM/APNs device tokens.
    """
    token = serializers.CharField(max_length=255)  # e.g. "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"

    def validate_token(self, value):
        """Reject anything that isn't an Expo push token (raw FCM tokens can't be sent to)."""
        value = value.strip()
        if not (value.startswith(('ExponentPushToken[', 'ExpoPushToken[')) and value.endswith(']')):
            raise serializers.ValidationError('Expected an Expo push token, e.g. "ExponentPushToken[...]".')
        return value

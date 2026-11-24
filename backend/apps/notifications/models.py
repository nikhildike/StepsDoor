"""Models for the notifications app.

Holds `FCMToken`: the push token of each signed-in mobile device, so alert
digests can also go out as push notifications (apps.notifications.push).
Despite the historical name, the tokens are Expo push tokens
("ExponentPushToken[...]") — the app gets them from expo-notifications and the
backend sends through Expo's push service, which forwards to FCM/APNs.
"""

from django.db import models


class FCMToken(models.Model):
    """One mobile device's Expo push token, owned by the user signed in on it.

    Registered by the app via POST /api/notifications/push-token/ after sign-in
    (PushTokenView), removed on sign-out (DELETE) or when Expo reports the
    device unregistered (apps.notifications.push). A token identifies a device,
    so it's unique: if another user signs in on the same phone, the row moves
    to them rather than notifying both accounts.
    """
    user = models.ForeignKey(
        'authentication.User',
        on_delete=models.CASCADE,  # Delete a user's tokens when the user account is deleted.
        related_name='fcm_tokens',  # Access via user.fcm_tokens.all().
    )
    # Expo push token, e.g. "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"; unique per device.
    token = models.CharField(max_length=255, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)  # Timestamp set once, at creation, for auditing/debugging.

    class Meta:
        verbose_name = 'FCM Token'
        verbose_name_plural = 'FCM Tokens'

    def __str__(self):
        """Human-readable representation shown in the Django admin and shell."""
        return f"Push token for {self.user}"

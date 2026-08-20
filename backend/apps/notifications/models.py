"""Models for the notifications app.

Currently holds `FCMToken`, which records the Firebase Cloud Messaging
device tokens registered by each user's mobile client so the backend can
target push notifications (e.g. job alerts, tender alerts) at that device.
"""

from django.db import models


class FCMToken(models.Model):
    """A single device's Firebase Cloud Messaging registration token.

    Created when a user's mobile app calls the FCM token registration
    endpoint (typically on login or app start) so Celery tasks such as the
    alert-matching job can look up a user's device(s) and send a push
    notification via Firebase.
    """
    user = models.ForeignKey(
        'authentication.User',
        on_delete=models.CASCADE,  # Delete a user's tokens when the user account is deleted.
        related_name='fcm_tokens',  # Access via user.fcm_tokens.all().
    )
    # The opaque FCM device/registration token issued by Firebase to the client app.
    # TextField because FCM tokens are long and have no fixed max length guarantee.
    token = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)  # Timestamp set once, at creation, for auditing/debugging.

    class Meta:
        verbose_name = 'FCM Token'
        verbose_name_plural = 'FCM Tokens'
        # Prevent the same device token from being registered twice for the same user
        # (re-registration on app relaunch should be a no-op, not a duplicate row).
        unique_together = ('user', 'token')

    def __str__(self):
        """Human-readable representation shown in the Django admin and shell."""
        return f"FCM token for {self.user}"

from django.db import models


class FCMToken(models.Model):
    user = models.ForeignKey(
        'authentication.User',
        on_delete=models.CASCADE,
        related_name='fcm_tokens',
    )
    token = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'FCM Token'
        verbose_name_plural = 'FCM Tokens'
        unique_together = ('user', 'token')

    def __str__(self):
        return f"FCM token for {self.user}"

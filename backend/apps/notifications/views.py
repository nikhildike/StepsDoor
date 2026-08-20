"""API views for the notifications app.

Exposes the FCM device-token registration endpoints consumed by the mobile
app (and, in principle, the web app) so the backend knows where to deliver
push notifications for a given user.
"""

from rest_framework import viewsets, permissions

from .models import FCMToken
from .serializers import FCMTokenSerializer


class FCMTokenViewSet(viewsets.ModelViewSet):
    """Manage Firebase Cloud Messaging tokens for push notifications.

    A standard authenticated CRUD endpoint used by client apps to register
    a device token after login/app start and to remove it on logout, so
    that Celery alert-matching tasks (e.g. job/tender alert dispatch) know
    which devices belong to which user.
    """
    serializer_class = FCMTokenSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Restrict results to FCM tokens owned by the requesting user only."""
        return FCMToken.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        """Force the new token's `user` to the authenticated request user.

        Prevents a client from registering a token under someone else's
        account by supplying a different `user` value in the request body.
        """
        serializer.save(user=self.request.user)

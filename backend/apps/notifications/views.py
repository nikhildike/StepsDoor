from rest_framework import viewsets, permissions

from .models import FCMToken
from .serializers import FCMTokenSerializer


class FCMTokenViewSet(viewsets.ModelViewSet):
    """Manage Firebase Cloud Messaging tokens for push notifications."""
    serializer_class = FCMTokenSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return FCMToken.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

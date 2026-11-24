"""
API views for the notifications app.

`PushTokenView` lets the mobile app register the device's Expo push token after
sign-in and remove it on sign-out, so alert digests (apps.notifications.alert_emails)
can also reach the user as push notifications (apps.notifications.push).
"""
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import FCMToken
from .serializers import PushTokenSerializer


class PushTokenView(APIView):
    """
    POST   /api/notifications/push-token/  {"token": "ExponentPushToken[...]"} — register this device
    DELETE /api/notifications/push-token/  {"token": "..."}                    — unregister it

    POST is idempotent and safe to call on every app start: a token identifies a device,
    so registering one already held by another account moves it to the caller (the
    previous user signed out on this phone). Responds 201 when created, 200 otherwise.
    DELETE only removes the caller's own token and always answers 204, so sign-out can
    fire it without caring whether the token was registered.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        """Register (or re-assign) the device token for the signed-in user."""
        serializer = PushTokenSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        _, created = FCMToken.objects.update_or_create(
            token=serializer.validated_data['token'],
            defaults={'user': request.user},
        )
        return Response({'token': serializer.validated_data['token']},
                        status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    def delete(self, request):
        """Remove the device token if it belongs to the signed-in user."""
        token = (request.data or {}).get('token', '')
        FCMToken.objects.filter(user=request.user, token=token).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

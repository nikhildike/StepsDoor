"""URL routing for the notifications app.

Wires `FCMTokenViewSet` (a full ModelViewSet) into a DRF router, exposing
the standard CRUD endpoints for FCM device-token registration, all under
whatever prefix this module is mounted at in the project's root urls.py
(e.g. `/api/notifications/`).
"""

from django.urls import path, include
from rest_framework.routers import SimpleRouter

from . import views

router = SimpleRouter()
# Registers standard REST routes for FCM tokens, all requiring authentication:
#   GET    fcm-tokens/       - list the current user's registered device tokens
#   POST   fcm-tokens/       - register a new device token (mobile app on login/app start)
#   GET    fcm-tokens/{id}/  - retrieve a single token
#   PUT/PATCH fcm-tokens/{id}/ - update a token
#   DELETE fcm-tokens/{id}/  - unregister a device token (e.g. on logout)
router.register(r'fcm-tokens', views.FCMTokenViewSet, basename='fcmtoken')

urlpatterns = [
    path('', include(router.urls)),
]

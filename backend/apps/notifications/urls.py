"""
URL routing for the notifications app, mounted at /api/notifications/ in config/urls.py.

  POST/DELETE push-token/ -> PushTokenView (register / unregister this device's Expo push token)
"""
from django.urls import path

from .views import PushTokenView

urlpatterns = [
    path('push-token/', PushTokenView.as_view(), name='push-token'),
]

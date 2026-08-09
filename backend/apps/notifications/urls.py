from django.urls import path, include
from rest_framework.routers import SimpleRouter

from . import views

router = SimpleRouter()
router.register(r'fcm-tokens', views.FCMTokenViewSet, basename='fcmtoken')

urlpatterns = [
    path('', include(router.urls)),
]

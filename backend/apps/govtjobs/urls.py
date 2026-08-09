from django.urls import path, include
from rest_framework.routers import SimpleRouter
from .views import GovtJobViewSet, GovtJobAlertViewSet

router = SimpleRouter()
router.register(r'', GovtJobViewSet, basename='govtjob')
router.register(r'alerts', GovtJobAlertViewSet, basename='govtjob-alert')

urlpatterns = [
    path('', include(router.urls)),
]

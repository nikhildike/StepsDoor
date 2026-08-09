from django.urls import path, include
from rest_framework.routers import SimpleRouter
from .views import TenderViewSet, TenderAlertViewSet

router = SimpleRouter()
router.register(r'', TenderViewSet, basename='tender')
router.register(r'alerts', TenderAlertViewSet, basename='tender-alert')

urlpatterns = [
    path('', include(router.urls)),
]

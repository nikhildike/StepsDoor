"""URL routing for the `careers` app: `/api/careers/jobs/` (members-only private-company jobs)."""
from django.urls import include, path
from rest_framework.routers import SimpleRouter

from .views import CareerJobViewSet

router = SimpleRouter()
router.register(r'jobs', CareerJobViewSet, basename='career-job')

urlpatterns = [
    path('', include(router.urls)),
]

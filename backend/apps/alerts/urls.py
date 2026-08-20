"""URL routing for the `alerts` app. Mounted under /api/alerts/ by the
project's root URLconf, exposing CRUD endpoints for a job seeker's saved
job-alert criteria."""

from django.urls import path, include
from rest_framework.routers import SimpleRouter

from . import views

router = SimpleRouter()
# Registers standard REST routes (list/create at '', retrieve/update/partial_update/destroy at
# '<pk>/') backed by JobAlertViewSet, scoped to the authenticated job seeker's own alerts.
# GET/POST /api/alerts/         - list the caller's job alerts / create a new one (job seeker, authenticated)
# GET/PUT/PATCH/DELETE /api/alerts/<pk>/ - retrieve/update/delete a specific alert owned by the caller (job seeker, authenticated)
router.register(r'', views.JobAlertViewSet, basename='jobalert')

urlpatterns = [
    path('', include(router.urls)),
]

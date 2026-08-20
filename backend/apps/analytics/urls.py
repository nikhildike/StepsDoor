"""URL routing for the `analytics` app. Mounted under /api/analytics/ by
the project's root URLconf, exposing endpoints to record and read job
click events that back the company analytics dashboard."""

from django.urls import path, include
from rest_framework.routers import SimpleRouter

from . import views

router = SimpleRouter()
# Registers standard REST routes under 'clicks/' backed by JobClickViewSet.
# GET/POST /api/analytics/clicks/         - list click events visible to the caller (staff: all; company: own job posts' clicks) / record a new click (authenticated)
# GET/PUT/PATCH/DELETE /api/analytics/clicks/<pk>/ - retrieve/update/delete a specific click event (authenticated, subject to get_queryset scoping)
router.register(r'clicks', views.JobClickViewSet, basename='jobclick')

urlpatterns = [
    path('', include(router.urls)),
]

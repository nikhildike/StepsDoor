"""
URL routing for the `govtjobs` app.

Registers two DRF routers: `GovtJobViewSet` (public, read-only browsing/
search of scraped govt job listings) and `GovtJobAlertViewSet` (authenticated
CRUD for a user's saved alerts).
"""
from django.urls import path, include
from rest_framework.routers import SimpleRouter
from .views import GovtJobViewSet, GovtJobAlertViewSet

router = SimpleRouter()
# GET /            -> list active govt jobs (public), filterable/searchable
# GET /<pk>/       -> retrieve a single govt job's full detail (public)
# GET /states/               -> list states that have active govt job listings, with counts
router.register(r'', GovtJobViewSet, basename='govtjob')
# GET /alerts/               -> list the current user's saved govt job alerts (authenticated)
# POST /alerts/              -> create a new govt job alert (authenticated)
# GET /alerts/<pk>/          -> retrieve one of the current user's alerts (authenticated)
# PUT/PATCH /alerts/<pk>/    -> update one of the current user's alerts (authenticated)
# DELETE /alerts/<pk>/       -> delete one of the current user's alerts (authenticated)
router.register(r'alerts', GovtJobAlertViewSet, basename='govtjob-alert')

urlpatterns = [
    path('', include(router.urls)),
]

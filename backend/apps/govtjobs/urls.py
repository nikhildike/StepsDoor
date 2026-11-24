"""
URL routing for the `govtjobs` app.

Registers two DRF routers: `GovtJobViewSet` (members-only, read-only browsing/
search of scraped govt job listings) and `GovtJobAlertViewSet` (authenticated
CRUD for a user's saved alerts).
"""
from django.urls import path, include
from rest_framework.routers import SimpleRouter
from .views import GovtJobViewSet, GovtJobAlertViewSet

router = SimpleRouter()
# GET /            -> list active govt jobs (auth required), filterable/searchable
# GET /<pk>/       -> retrieve a single govt job's full detail (auth required)
# GET /states/               -> list states that have active govt job listings, with counts
# Registered FIRST: the '' viewset's detail route (<pk>/) would otherwise match
# 'alerts/' and answer 404 ("tender/govt job with id 'alerts'").
# GET /alerts/               -> list the current user's saved govt job alerts (authenticated)
# POST /alerts/              -> create a new govt job alert (authenticated)
# GET /alerts/<pk>/          -> retrieve one of the current user's alerts (authenticated)
# PUT/PATCH /alerts/<pk>/    -> update one of the current user's alerts (authenticated)
# DELETE /alerts/<pk>/       -> delete one of the current user's alerts (authenticated)
router.register(r'alerts', GovtJobAlertViewSet, basename='govtjob-alert')
router.register(r'', GovtJobViewSet, basename='govtjob')

urlpatterns = [
    path('', include(router.urls)),
]

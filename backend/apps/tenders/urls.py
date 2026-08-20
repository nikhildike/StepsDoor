"""
URL routing for the `tenders` app's API.

Mounted under some prefix (e.g. `/api/tenders/`) by the project's root URLconf. Exposes the
public tender-browsing endpoints and the authenticated tender-alert CRUD endpoints via two
DRF routers registered on the same router instance.
"""
from django.urls import path, include
from rest_framework.routers import SimpleRouter
from .views import TenderViewSet, TenderAlertViewSet

router = SimpleRouter()
# GET  /            -> list active tenders (filterable/searchable/orderable, public)
# GET  /<id>/       -> retrieve a single tender's full detail (public)
# GET  /states/     -> custom action: states with at least one active tender + counts (public)
router.register(r'', TenderViewSet, basename='tender')
# GET    /alerts/          -> list the current user's saved tender alerts (auth required)
# POST   /alerts/          -> create a new tender alert for the current user (auth required)
# GET    /alerts/<id>/     -> retrieve one of the current user's alerts (auth required)
# PUT/PATCH /alerts/<id>/  -> update one of the current user's alerts (auth required)
# DELETE /alerts/<id>/     -> delete one of the current user's alerts (auth required)
router.register(r'alerts', TenderAlertViewSet, basename='tender-alert')

urlpatterns = [
    path('', include(router.urls)),
]

"""
URL routing for the `tenders` app's API.

Mounted under some prefix (e.g. `/api/tenders/`) by the project's root URLconf. Exposes the
members-only tender-browsing endpoints and the authenticated tender-alert CRUD endpoints via two
DRF routers registered on the same router instance.
"""
from django.urls import path, include
from rest_framework.routers import SimpleRouter
from .views import SavedTenderViewSet, TenderAlertViewSet, TenderStatsView, TenderViewSet

router = SimpleRouter()
# GET  /            -> list active tenders (filterable/searchable/orderable, auth required)
# GET  /<id>/       -> retrieve a single tender's full detail (auth required)
# GET  /states/     -> custom action: states with at least one active tender + counts (auth required)
# Registered FIRST: the '' viewset's detail route (<pk>/) would otherwise match
# 'alerts/' and answer 404 ("tender/govt job with id 'alerts'").
# GET    /alerts/          -> list the current user's saved tender alerts (auth required)
# POST   /alerts/          -> create a new tender alert for the current user (auth required)
# GET    /alerts/<id>/     -> retrieve one of the current user's alerts (auth required)
# PUT/PATCH /alerts/<id>/  -> update one of the current user's alerts (auth required)
# DELETE /alerts/<id>/     -> delete one of the current user's alerts (auth required)
# GET    /alerts/<id>/matches/, /alerts/matches/, /alerts/suggestions/?q= -> matching tenders, keyword autocomplete
router.register(r'alerts', TenderAlertViewSet, basename='tender-alert')
# GET/POST /saved/, DELETE /saved/<id>/ -> the current user's saved tenders (also before '')
router.register(r'saved', SavedTenderViewSet, basename='saved-tender')
router.register(r'', TenderViewSet, basename='tender')

urlpatterns = [
    path('stats/', TenderStatsView.as_view(), name='tender-stats'),  # contractor dashboard counts (before the <pk>/ route)
    path('', include(router.urls)),
]

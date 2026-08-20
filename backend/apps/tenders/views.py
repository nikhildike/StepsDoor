"""
DRF views for the `tenders` app's API.

Provides the public, unauthenticated tender-browsing endpoints (job seekers browse tenders
for free, per the product's revenue model — only company job listings are paid) and the
authenticated tender-alert management endpoints. Wired up via `urls.py`'s router.
"""
from django.conf import settings
from django.db.models import Count
from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from .models import Tender, TenderAlert
from .serializers import TenderListSerializer, TenderDetailSerializer, TenderAlertSerializer


class TenderViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Public read-only endpoint for government tenders.

    Supports filtering by state, category, source_portal and full-text search via ?search=
    (PostgreSQL FTS when available, otherwise DRF's basic icontains SearchFilter on SQLite).
    Backs the tenders listing/detail pages in the web and mobile frontends; no auth required
    since tender browsing is free for all job seekers.
    """
    authentication_classes = []  # explicitly disable auth parsing — this endpoint is fully public
    permission_classes = [permissions.AllowAny]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['state', 'category', 'source_portal', 'is_active']
    search_fields = ['title', 'organisation']  # used by SearchFilter's icontains fallback (non-Postgres path)
    ordering_fields = ['published_at', 'submission_deadline', 'estimated_value']
    ordering = ['-published_at']

    def get_queryset(self):
        """
        Base queryset of active tenders, upgraded to Postgres full-text ranked search when
        a `?search=` query param is present and the DB backend is PostgreSQL.

        Called by DRF for every list/retrieve request on this viewset.
        """
        qs = Tender.objects.filter(is_active=True)

        search = self.request.query_params.get('search', '').strip()
        if search and 'postgresql' in settings.DATABASES['default']['ENGINE']:
            # Postgres-only path: rank results by relevance against the precomputed
            # search_vector (see Tender.save()). On SQLite this block is skipped entirely
            # and the `search` filter_backend's SearchFilter (icontains) handles it instead.
            from django.contrib.postgres.search import SearchQuery, SearchRank
            from django.db.models import F
            query = SearchQuery(search)
            qs = (
                qs.filter(search_vector=query)
                .annotate(rank=SearchRank(F('search_vector'), query))
                .order_by('-rank')
            )

        return qs

    def get_serializer_class(self):
        """Use the full detail serializer for single-tender retrieval, the lightweight one for lists."""
        if self.action == 'retrieve':
            return TenderDetailSerializer
        return TenderListSerializer

    @action(detail=False, methods=['get'], url_path='states')
    def states(self, request):
        """
        Return states that have at least one active tender, with counts.

        Backs a state-filter dropdown/picker in the frontend (GET /api/tenders/states/).
        Restricted to `PORTAL_STATE_MAP`'s known values so stray/malformed state strings
        scraped from a portal don't pollute the picker.
        """
        from scrapers.state_map import PORTAL_STATE_MAP
        valid_states = set(PORTAL_STATE_MAP.values())
        rows = (
            Tender.objects.filter(is_active=True, state__in=valid_states)
            .values('state')
            .annotate(count=Count('id'))
            .order_by('state')
        )
        return Response([{'state': r['state'], 'count': r['count']} for r in rows])


class TenderAlertViewSet(viewsets.ModelViewSet):
    """
    Authenticated endpoint — manage the current user's tender alerts.

    Full CRUD (list/create/retrieve/update/delete) scoped to the requesting user's own
    `TenderAlert` rows; these are what `apps.tenders.tasks.match_tender_alerts` reads when
    matching newly scraped tenders.
    """
    serializer_class = TenderAlertSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Restrict every action to alerts owned by the requesting user — never expose other users' alerts."""
        return TenderAlert.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        """Force-assign the authenticated user as owner on create, ignoring any client-supplied user field."""
        serializer.save(user=self.request.user)

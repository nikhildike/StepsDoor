"""
DRF views for the `tenders` app's API.

Provides the members-only tender-browsing endpoints (free, but scraped data is shown to
logged-in users only — anonymous requests get 401), the authenticated tender-alert
endpoints (CRUD, matching tenders, keyword suggestions), saved tenders and the
contractor dashboard stats. Wired up via `urls.py`.
"""
from django.conf import settings
from django.db.models import Count
from rest_framework import mixins, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from .listings import collect_matches, keyword_suggestions, new_today_count, open_tenders
from .models import SavedTender, Tender, TenderAlert
from .serializers import SavedTenderSerializer, TenderListSerializer, TenderDetailSerializer, TenderAlertSerializer


class TenderViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Members-only read-only endpoint for government tenders (401 without a JWT).

    Supports filtering by state, category, source_portal and full-text search via ?search=
    (PostgreSQL FTS when available, otherwise DRF's basic icontains SearchFilter on SQLite).
    Backs the tender previews/detail pages in the web and mobile frontends, which only call
    it when signed in and otherwise show a sign-in prompt.
    """
    # Members only: scraped data is shown to logged-in users (JWT, the project default
    # authentication). Applies to list, retrieve and the /states/ facet alike.
    permission_classes = [permissions.IsAuthenticated]
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

    def _limit(self, request):
        """`?limit=` (default 20, capped at 50): how many matching tenders to list."""
        try:
            return max(1, min(int(request.query_params.get('limit', 20)), 50))
        except ValueError:
            return 20

    def _matches_response(self, alerts, limit):
        """{count, results: [tender list fields]} for the open tenders matching `alerts`."""
        matches = collect_matches(alerts, limit)
        return Response({'count': matches['count'], 'results': TenderListSerializer(matches['results'], many=True).data})

    @action(detail=True)
    def matches(self, request, pk=None):
        """GET /api/tenders/alerts/{id}/matches/ — open tenders this alert matches, soonest closing first.

        Same matching as the daily digest (`apps.tenders.listings.alert_match_queryset`).
        Works for paused alerts too, so a user can preview one before switching it on.
        """
        return self._matches_response([self.get_object()], self._limit(request))

    @action(detail=False, url_path='matches')
    def all_matches(self, request):
        """GET /api/tenders/alerts/matches/ — open tenders matching any active alert, each once (dashboard)."""
        return self._matches_response(list(self.get_queryset().filter(is_active=True)), self._limit(request))

    @action(detail=False)
    def suggestions(self, request):
        """GET /api/tenders/alerts/suggestions/?q=road — keywords from open tenders' titles: [{keyword, count}]."""
        return Response(keyword_suggestions(request.query_params.get('q', '')))


class SavedTenderViewSet(mixins.ListModelMixin, mixins.CreateModelMixin, mixins.DestroyModelMixin,
                         viewsets.GenericViewSet):
    """The signed-in user's saved tenders (`/api/tenders/saved/`): list, save, unsave.

    POST `{tender: <id>}` is idempotent: saving a tender that's already saved returns
    the existing bookmark with 200 (new ones 201). DELETE uses the bookmark's id.
    Used by the tender cards' bookmark toggle and the Saved Tenders page (web, mobile).
    """
    serializer_class = SavedTenderSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None  # a personal list; the clients render it whole

    def get_queryset(self):
        """Only the requesting user's bookmarks, newest first."""
        return SavedTender.objects.filter(user=self.request.user).select_related('tender')

    def create(self, request, *args, **kwargs):
        """Save a tender, or return the existing bookmark if it's already saved."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        saved, created = SavedTender.objects.get_or_create(user=request.user, tender=serializer.validated_data['tender'])
        return Response(self.get_serializer(saved).data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class TenderStatsView(APIView):
    """GET /api/tenders/stats/ — the numbers on the contractor dashboard's stat cards.

    Returns {saved_tenders, active_alerts, alert_matches (open tenders matching any
    active alert, each once), new_today (open tenders first scraped since midnight
    IST), open_tenders}. Used by the web contractor dashboard and the mobile Home tab.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """Compute the counts for the requesting user."""
        alerts = list(TenderAlert.objects.filter(user=request.user, is_active=True))
        return Response({
            'saved_tenders': SavedTender.objects.filter(user=request.user).count(),
            'active_alerts': len(alerts),
            'alert_matches': collect_matches(alerts, limit=0)['count'] if alerts else 0,
            'new_today': new_today_count(),
            'open_tenders': open_tenders().count(),
        })

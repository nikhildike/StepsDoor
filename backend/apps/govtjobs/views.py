"""
Views for the `govtjobs` app.

Exposes `GovtJobViewSet`, the public read-only browsing/search API for
scraped government job listings, and `GovtJobAlertViewSet`, the authenticated
CRUD API a job seeker uses to manage their own saved alerts. Routed in
`urls.py`.
"""
from django.conf import settings
from django.db.models import Count
from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from .models import GovtJob, GovtJobAlert
from .serializers import GovtJobListSerializer, GovtJobDetailSerializer, GovtJobAlertSerializer


class GovtJobViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Public read-only endpoint for government jobs.
    Supports filtering by state, category, source_portal and
    full-text search via ?search= (PostgreSQL FTS when available).
    """
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['state', 'category', 'source_portal', 'is_active']
    search_fields = ['title', 'organisation']
    ordering_fields = ['published_at', 'application_deadline', 'vacancy_count']
    ordering = ['-published_at']

    def get_queryset(self):
        """Return active govt jobs, ranked by PostgreSQL full-text search relevance
        when a `?search=` query param is present and the DB backend supports it.

        On non-PostgreSQL backends (e.g. SQLite in dev), the `search` param is
        ignored here and instead handled generically by DRF's `SearchFilter`
        (declared in `search_fields` below), since `search_vector` isn't
        populated outside of PostgreSQL (see `GovtJob.save()`).
        """
        qs = GovtJob.objects.filter(is_active=True)

        search = self.request.query_params.get('search', '').strip()
        if search and 'postgresql' in settings.DATABASES['default']['ENGINE']:
            from django.contrib.postgres.search import SearchQuery, SearchRank
            from django.db.models import F
            query = SearchQuery(search)
            qs = (
                qs.filter(search_vector=query)
                # Rank results by relevance so best-matching jobs (per the title/organisation/qualification weights) sort first
                .annotate(rank=SearchRank(F('search_vector'), query))
                .order_by('-rank')
            )

        return qs

    def get_serializer_class(self):
        """Use the full detail serializer for a single job, and the compact
        list serializer for browsing/search results."""
        if self.action == 'retrieve':
            return GovtJobDetailSerializer
        return GovtJobListSerializer

    @action(detail=False, methods=['get'], url_path='states')
    def states(self, request):
        """Return states that have at least one active govt job, with counts.

        Used to populate a location filter/facet on the public govt jobs
        browse page.
        """
        # Only include states that look like real state names (not scraped junk) —
        # raw scraped `state` values can contain inconsistent/garbage text, so we
        # cross-check against the known portal->state mapping to keep the facet clean
        from scrapers.state_map import PORTAL_STATE_MAP
        valid_states = set(PORTAL_STATE_MAP.values())
        rows = (
            GovtJob.objects.filter(is_active=True, state__in=valid_states)
            .values('state')
            .annotate(count=Count('id'))
            .order_by('state')
        )
        return Response([{'state': r['state'], 'count': r['count']} for r in rows])


class GovtJobAlertViewSet(viewsets.ModelViewSet):
    """Authenticated endpoint — manage the current user's govt job alerts.

    Full CRUD so a job seeker can create, view, edit, and delete their own
    saved alerts; alerts are matched against new listings by the Celery task
    `tasks.match_govtjob_alerts`.
    """
    serializer_class = GovtJobAlertSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Scope alerts to only those owned by the requesting user."""
        return GovtJobAlert.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        """Attach the requesting user as the owner when a new alert is created."""
        serializer.save(user=self.request.user)

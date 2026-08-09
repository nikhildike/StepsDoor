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
        qs = GovtJob.objects.filter(is_active=True)

        search = self.request.query_params.get('search', '').strip()
        if search and 'postgresql' in settings.DATABASES['default']['ENGINE']:
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
        if self.action == 'retrieve':
            return GovtJobDetailSerializer
        return GovtJobListSerializer

    @action(detail=False, methods=['get'], url_path='states')
    def states(self, request):
        """Return states that have at least one active govt job, with counts."""
        # Only include states that look like real state names (not scraped junk)
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
    """Authenticated endpoint — manage the current user's govt job alerts."""
    serializer_class = GovtJobAlertSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return GovtJobAlert.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

"""API views for private-company careers jobs.

Members only, like tenders and govt jobs: anonymous requests get 401, and the
web client only calls this when a token exists (guests see the MembersOnly
prompt instead — see CLAUDE.md "Members-only scraped data").
"""
from collections import Counter

from django.db.models import Count, Q
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.response import Response

from .cities import decode_cities
from .models import CareerJob, CareerSource
from .serializers import CareerCompanySerializer, CareerJobSerializer


class CareerJobViewSet(viewsets.ReadOnlyModelViewSet):
    """List/retrieve active jobs from active careers sources (`/api/careers/jobs/`).

    Query params: `search` (title, company, location), `company` (CareerSource
    id), `sector`, `city` (a standard name from `/cities/`, e.g. 'Bengaluru'),
    `ordering` (`posted_at`, `first_seen_at`; default newest first). Paginated with the project default (20/page). Used by the web
    Companies page (`components/companies/LatestCompanyJobs.jsx`).
    """
    serializer_class = CareerJobSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['title', 'source__company_name', 'location']
    ordering_fields = ['posted_at', 'first_seen_at']
    ordering = ['-posted_at', '-first_seen_at']

    def get_queryset(self):
        """Active jobs of active sources, narrowed by the `company` / `sector` / `city` query params."""
        qs = CareerJob.objects.filter(is_active=True, source__is_active=True).select_related('source')
        company = self.request.query_params.get('company')
        if company and company.isdigit():
            qs = qs.filter(source_id=int(company))
        sector = self.request.query_params.get('sector')
        if sector:
            qs = qs.filter(source__sector=sector)
        city = self.request.query_params.get('city')
        if city and '|' not in city:
            qs = qs.filter(cities__contains=f'|{city}|')  # whole-name match within '|A|B|'
        return qs

    def _open_jobs(self):
        """Active jobs of active sources, before any query-param filtering (for the picker endpoints)."""
        return CareerJob.objects.filter(is_active=True, source__is_active=True)

    @action(detail=False, pagination_class=None)
    def cities(self, request):
        """Cities with open jobs and their counts, busiest first, for the city filter: `[{city, count}]`.

        A job listed in two cities counts once in each. Jobs whose location
        names only a state or "India" aren't in any city.
        """
        counts = Counter()
        for value in self._open_jobs().exclude(cities='').values_list('cities', flat=True):
            counts.update(decode_cities(value))
        return Response([{'city': c, 'count': n} for c, n in sorted(counts.items(), key=lambda kv: (-kv[1], kv[0]))])

    @action(detail=False, pagination_class=None)
    def companies(self, request):
        """Companies that currently have open jobs, with counts (for the company filter), busiest first."""
        sources = (CareerSource.objects.filter(is_active=True)
                   .annotate(job_count=Count('jobs', filter=Q(jobs__is_active=True)))
                   .filter(job_count__gt=0).order_by('-job_count', 'company_name'))
        return Response(CareerCompanySerializer(sources, many=True).data)

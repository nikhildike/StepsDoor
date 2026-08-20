"""Views for the `companies` app.

`CompanyViewSet` is the authenticated CRUD API for a company's own profile
(plus a `me` shortcut action), used by the company dashboard. `CompanyPublicListView`
and `CompanyCareersView` are anonymous, read-only endpoints used by job
seekers browsing companies and viewing a specific company's career page.
"""
from rest_framework import viewsets, permissions, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.db.models import Count, Q

from .models import Company
from .serializers import CompanySerializer, CompanyPublicSerializer


class CompanyViewSet(viewsets.ModelViewSet):
    """Authenticated CRUD for `Company` profiles, mounted at `/api/companies/` via the router in urls.py.

    Backs the company dashboard's profile screen. Note `get_queryset`
    returns *all* companies rather than filtering to the requester's own —
    access control for standard list/retrieve/update/delete actions relies
    on `IsAuthenticated` only, while the `me` action below is the
    self-service entry point company users actually use to manage their
    own profile.
    """
    serializer_class = CompanySerializer
    permission_classes = [permissions.IsAuthenticated]  # Requires login; any authenticated user (not just company-role) can hit standard CRUD routes

    def get_queryset(self):
        """Return the base queryset for list/retrieve/update/delete actions on this viewset."""
        return Company.objects.all()

    def perform_create(self, serializer):
        """Attach the requesting user as the new Company's owner. Called by DRF's `create()` on POST to `/api/companies/`."""
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['get', 'patch'], url_path='me')
    def me(self, request):
        """Get or partially update the caller's own Company profile.

        The primary endpoint the company dashboard uses (GET/PATCH
        `/api/companies/me/`) instead of looking up a company by id, so the
        frontend never needs to know its own company's primary key.
        """
        try:
            company = request.user.company
        except Company.DoesNotExist:
            return Response({'detail': 'No company profile found.'}, status=status.HTTP_404_NOT_FOUND)
        if request.method == 'PATCH':
            serializer = self.get_serializer(company, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)
        return Response(self.get_serializer(company).data)


class CompanyPublicListView(generics.ListAPIView):
    """Public list of companies that have at least one active job post."""
    authentication_classes = []  # Explicitly disables auth parsing — avoids unnecessary JWT processing on a fully anonymous, public endpoint
    permission_classes = [permissions.AllowAny]  # Anonymous — job seekers browse this without logging in
    serializer_class = CompanyPublicSerializer

    def get_queryset(self):
        """Companies with at least one active job, ordered by job count then name; used to populate the public "browse companies" page."""
        return (
            Company.objects
            # Count only active jobs per company so hiring volume reflects current openings, not historical/inactive posts
            .annotate(active_job_count=Count('jobs', filter=Q(jobs__is_active=True)))
            .filter(active_job_count__gt=0)  # Hide companies with no live postings — nothing for a job seeker to see there
            .order_by('-active_job_count', 'name')  # Most active hirers surface first; alphabetical as a tiebreaker
        )


class CompanyCareersView(generics.GenericAPIView):
    """Public career page — returns company info + all active jobs."""
    authentication_classes = []  # Explicitly disables auth parsing — avoids unnecessary JWT processing on a fully anonymous, public endpoint
    permission_classes = [permissions.AllowAny]  # Anonymous — this is the page job seekers land on to apply, no login required to view it
    serializer_class = CompanySerializer

    def get(self, request, slug):
        """Return a company's public profile plus its active job listings. Called on GET `/api/companies/<slug>/careers/`, anonymous access — this is the company's public careers/apply page."""
        from apps.jobs.models import JobPost  # Local import avoids a circular import between the companies and jobs apps
        from apps.jobs.serializers import JobPostSerializer  # Local import avoids a circular import between the companies and jobs apps

        company = get_object_or_404(Company, slug=slug)  # 404s automatically for an unknown/mistyped slug instead of raising an unhandled exception
        jobs = JobPost.objects.filter(company=company, is_active=True).order_by('-created_at')  # Only ever show live postings on the public page; newest first
        return Response({
            'company': CompanySerializer(company).data,
            'jobs': JobPostSerializer(jobs, many=True).data,
        })

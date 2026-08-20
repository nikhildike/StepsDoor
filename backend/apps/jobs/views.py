"""API views for the `jobs` app.

Exposes `JobPostViewSet`, the single DRF ViewSet backing all job
listing endpoints: public browsing by anonymous job seekers, CRUD by
authenticated company users managing their own listings, and the
click-tracking endpoint used when a job seeker clicks "Apply" (which
redirects them off-platform to the company's careers page).
"""
from django.db import models as db_models
from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import JobPost
from .serializers import JobPostSerializer


class JobPostViewSet(viewsets.ModelViewSet):
    """CRUD + browsing endpoints for `JobPost`.

    Anonymous job seekers use `list`/`retrieve`/`track_click` to
    browse jobs and apply (redirect). Authenticated company users use
    the standard create/update/delete actions plus `my_jobs` to
    manage their own postings from the company dashboard.
    """
    serializer_class = JobPostSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['city', 'job_type', 'is_active', 'company']
    search_fields = ['title', 'description', 'location', 'city']
    ordering_fields = ['created_at', 'salary_min', 'salary_max', 'clicks']
    ordering = ['-created_at']

    def get_authenticators(self):
        """Skip JWT authentication entirely for public actions.

        Called by DRF before permission checks on every request. For
        list/retrieve/track_click we don't want a bad/expired Authorization
        header on an anonymous request to raise an auth error, since
        job browsing and applying must work for logged-out visitors.
        """
        if self.action in ['list', 'retrieve', 'track_click']:
            return []
        return super().get_authenticators()

    def get_permissions(self):
        """Allow anonymous access to browsing/click actions; require auth otherwise.

        Called by DRF per-request to decide who may hit this action.
        Job seekers never log in to browse or apply, so list/retrieve/
        track_click are open; posting/editing/deleting a job requires
        an authenticated company user.
        """
        if self.action in ['list', 'retrieve', 'track_click']:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        """Base queryset for list/retrieve: only active, non-expired-looking listings.

        Filters to `is_active=True` so job seekers never see listings a
        company has deactivated, and select_related('company') avoids an
        extra query per row for the denormalized company_name/slug/logo
        fields in the serializer.
        """
        return JobPost.objects.filter(is_active=True).select_related('company')

    def perform_create(self, serializer):
        """Attach the posting company from the authenticated request user.

        Called by DRF's CreateModelMixin after validation. The company
        is never taken from client input (see read_only_fields in the
        serializer) — it's always the company owned by the logged-in
        user, so a company can only ever post jobs under its own account.
        """
        serializer.save(company=self.request.user.company)

    @action(detail=False, methods=['get'], url_path='my', permission_classes=[permissions.IsAuthenticated])
    def my_jobs(self, request):
        """List every job post (active or not) belonging to the requesting company.

        Backs the company dashboard's "Manage Jobs" page, where a
        company needs to see and edit its inactive/expired listings
        too — unlike the public `list` action, this is not filtered
        to is_active=True.
        """
        qs = JobPost.objects.filter(
            company__user=request.user
        ).select_related('company').order_by('-created_at')
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='track-click', permission_classes=[permissions.AllowAny])
    def track_click(self, request, pk=None):
        """Record an "Apply" click and hand back the company's redirect URL.

        Called by the frontend/mobile client when a job seeker clicks
        Apply on a listing. Since there's no in-app application flow,
        this endpoint's job is purely to log the click (for company
        analytics) before sending the seeker off to redirect_url, the
        company's own careers page.
        """
        job = self.get_object()
        # Imported locally to avoid a module-level circular import between
        # the jobs and analytics apps.
        from apps.analytics.models import JobClick
        JobClick.objects.create(
            job_post=job,
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
        )
        # Atomic DB-level increment (F() expression) rather than a Python
        # read-modify-write, so concurrent clicks don't race and undercount.
        JobPost.objects.filter(pk=job.pk).update(clicks=db_models.F('clicks') + 1)
        return Response({'redirect_url': job.redirect_url})

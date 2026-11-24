"""API views for the `jobs` app.

Exposes `JobPostViewSet`, the single DRF ViewSet backing all job
listing endpoints: public browsing by anonymous job seekers, CRUD by
company and contractor accounts managing their own listings, and the
click-tracking endpoint used when a job seeker clicks "Apply" (which
redirects them off-platform to the company's careers page).
"""
from django.db import models as db_models
from rest_framework import viewsets, permissions
from rest_framework.exceptions import PermissionDenied
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from core.mixins import PublicActionsAuthMixin

from .models import JobPost
from .serializers import JobPostSerializer

# Actions that change a listing; they only ever see the caller's own jobs (see get_queryset).
OWNER_ACTIONS = ('update', 'partial_update', 'destroy')


class CanPostJobs(permissions.BasePermission):
    """Company accounts (store owners included — they're is_company too) and contractors may post jobs."""
    message = 'Only company or contractor accounts can post jobs.'

    def has_permission(self, request, view):
        """True for an authenticated company or contractor user."""
        user = request.user
        return bool(user and user.is_authenticated and (user.is_company or user.is_contractor))


def posting_company(user):
    """
    The Company a user's job posts belong to, creating one for a contractor on first post.

    JobPost.company is required, and contractors register with a ContractorProfile rather
    than a Company. Their first post creates a Company from the firm name (as registration
    does for company and store-owner accounts), which also gives the firm a public careers
    page at /careers/<slug>. The user's role flags are left alone — they stay a contractor.
    """
    from apps.companies.models import Company
    company = Company.objects.filter(user=user).first()
    if company:
        return company
    if not user.is_contractor:
        raise PermissionDenied(CanPostJobs.message)
    profile = getattr(user, 'contractor_profile', None)
    return Company.objects.create(
        user=user,
        name=(profile.firm_name if profile else '') or user.get_full_name() or user.username,
        gst_number=profile.gstin if profile else '',
        pan_number=profile.pan_number if profile else '',
        contact_email=user.email or (profile.contact_email if profile else ''),
    )


class JobPostViewSet(PublicActionsAuthMixin, viewsets.ModelViewSet):
    """CRUD + browsing endpoints for `JobPost`.

    Anonymous job seekers use `list`/`retrieve`/`track_click` to
    browse jobs and apply (redirect). Company and contractor accounts use
    create (CanPostJobs) plus update/delete and `my_jobs` to manage their
    own postings — from the company dashboard (/dashboard/jobs) or the
    contractor dashboard (/seeker/jobs).
    """
    serializer_class = JobPostSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['city', 'job_type', 'is_active', 'company']
    search_fields = ['title', 'description', 'location', 'city']
    ordering_fields = ['created_at', 'salary_min', 'salary_max', 'clicks']
    ordering = ['-created_at']

    # No JWT authentication on these (PublicActionsAuthMixin): a bad/expired
    # Authorization header on an anonymous request mustn't raise an auth error,
    # since job browsing and applying must work for logged-out visitors.
    public_actions = ('list', 'retrieve', 'track_click')

    def get_permissions(self):
        """Allow anonymous access to browsing/click actions; require auth otherwise.

        Called by DRF per-request to decide who may hit this action.
        Job seekers never log in to browse or apply, so list/retrieve/
        track_click are open; posting needs a company or contractor
        account; editing/deleting needs login and is limited to the
        caller's own jobs by get_queryset.
        """
        if self.action in ['list', 'retrieve', 'track_click']:
            return [permissions.AllowAny()]
        if self.action == 'create':
            return [CanPostJobs()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        """
        Public actions see active listings; edit/delete actions see only the caller's own jobs.

        For list/retrieve, `is_active=True` keeps deactivated listings out of public view.
        For update/partial_update/destroy the queryset is the caller's jobs — active or
        not — so (a) nobody can edit or delete another poster's job (404), and (b) an owner
        can reactivate a job they paused. select_related('company') avoids a query per row
        for the serializer's company fields.
        """
        if self.action in OWNER_ACTIONS:
            return JobPost.objects.filter(company__user=self.request.user).select_related('company')
        return JobPost.objects.filter(is_active=True).select_related('company')

    def perform_create(self, serializer):
        """Attach the posting company from the authenticated request user.

        Called by DRF's CreateModelMixin after validation. The company
        is never taken from client input (see read_only_fields in the
        serializer) — it's always the logged-in user's own company
        (created on a contractor's first post, see posting_company).
        """
        serializer.save(company=posting_company(self.request.user))

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

"""
Views for the `freelancers` app.

Exposes a single DRF ModelViewSet, `FreelancerProfileViewSet`, that serves the
public freelancer browsing/search API as well as authenticated endpoints for
a freelancer to manage their own profile and for hirers to submit reviews.
Routed in `urls.py`.
"""
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import FreelancerProfile, FreelancerReview
from .serializers import FreelancerListSerializer, FreelancerDetailSerializer, FreelancerReviewSerializer


class FreelancerProfileViewSet(viewsets.ModelViewSet):
    """CRUD + browse/search API for freelancer profiles.

    `list`/`retrieve` are public and only ever return active profiles; the
    remaining CRUD actions (create/update/partial_update/destroy) are
    authenticated and scoped to the requesting user's own profile. Also
    exposes custom actions for the "my profile" shortcut, submitting reviews,
    and listing states with active profiles.
    """
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['category', 'availability', 'state', 'is_verified']
    search_fields    = ['headline', 'bio', 'skills', 'city', 'state']
    ordering_fields  = ['created_at', 'hourly_rate', 'years_of_experience']
    ordering         = ['-created_at']

    def get_queryset(self):
        """Return active profiles (with reviews prefetched) for public actions,
        otherwise scope the queryset to the requesting user's own profile(s)
        for authenticated CRUD actions."""
        if self.action in ['list', 'retrieve']:
            return FreelancerProfile.objects.filter(is_active=True).prefetch_related('reviews')
        return FreelancerProfile.objects.filter(user=self.request.user)

    def get_serializer_class(self):
        """Pick the compact list serializer for browsing, and the full detail
        serializer for viewing/creating/editing a single profile."""
        if self.action == 'retrieve':
            return FreelancerDetailSerializer
        if self.action in ['create', 'update', 'partial_update', 'me']:
            return FreelancerDetailSerializer
        return FreelancerListSerializer

    def get_permissions(self):
        """Allow anyone to browse/view profiles; require authentication for
        anything that creates or mutates data."""
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_authenticators(self):
        """Skip running authenticators on public list/retrieve requests so
        anonymous browsing never triggers unnecessary auth/token checks."""
        if self.action in ['list', 'retrieve']:
            return []
        return super().get_authenticators()

    def perform_create(self, serializer):
        """Attach the requesting user as the owner when a profile is created."""
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['get', 'put', 'patch'], url_path='me',
            permission_classes=[permissions.IsAuthenticated])
    def me(self, request):
        """Get or update the current user's freelancer profile.

        Called by the freelancer's own dashboard/profile-edit screen; creates
        an empty profile on first access via get_or_create so the frontend
        always has a profile object to render/edit.
        """
        profile, _ = FreelancerProfile.objects.get_or_create(
            user=request.user,
            defaults={'headline': '', 'skills': []},
        )
        if request.method == 'GET':
            return Response(FreelancerDetailSerializer(profile).data)
        serializer = FreelancerDetailSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='review',
            permission_classes=[permissions.IsAuthenticated])
    def add_review(self, request, pk=None):
        """Submit a review for a freelancer (one per user).

        Called when a hirer rates a freelancer they've worked with; a repeat
        submission from the same reviewer updates their existing review
        (via update_or_create) instead of creating a duplicate, matching the
        FreelancerReview (freelancer, reviewer) unique constraint.
        """
        profile = self.get_object()
        if profile.user == request.user:
            # A freelancer can't inflate/deflate their own rating by reviewing themselves
            return Response({'detail': 'You cannot review your own profile.'}, status=status.HTTP_400_BAD_REQUEST)
        serializer = FreelancerReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        review, created = FreelancerReview.objects.update_or_create(
            freelancer=profile,
            reviewer=request.user,
            defaults={
                'rating': serializer.validated_data['rating'],
                'comment': serializer.validated_data.get('comment', ''),
            },
        )
        return Response(FreelancerReviewSerializer(review).data,
                        status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='states',
            permission_classes=[permissions.AllowAny])
    def states(self, request):
        """Return states that have active freelancer profiles.

        Used to populate a location filter/facet on the public freelancer
        browse page, so only states with actual listings are offered.
        """
        from django.db.models import Count
        rows = (
            FreelancerProfile.objects
            .filter(is_active=True)
            .exclude(state='')  # Skip profiles without a state set — they'd otherwise show up as a blank facet option
            .values('state')
            .annotate(count=Count('id'))
            .order_by('state')
        )
        return Response([{'state': r['state'], 'count': r['count']} for r in rows])

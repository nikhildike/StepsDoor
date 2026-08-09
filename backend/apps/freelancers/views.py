from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import FreelancerProfile, FreelancerReview
from .serializers import FreelancerListSerializer, FreelancerDetailSerializer, FreelancerReviewSerializer


class FreelancerProfileViewSet(viewsets.ModelViewSet):
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['category', 'availability', 'state', 'is_verified']
    search_fields    = ['headline', 'bio', 'skills', 'city', 'state']
    ordering_fields  = ['created_at', 'hourly_rate', 'years_of_experience']
    ordering         = ['-created_at']

    def get_queryset(self):
        if self.action in ['list', 'retrieve']:
            return FreelancerProfile.objects.filter(is_active=True).prefetch_related('reviews')
        return FreelancerProfile.objects.filter(user=self.request.user)

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return FreelancerDetailSerializer
        if self.action in ['create', 'update', 'partial_update', 'me']:
            return FreelancerDetailSerializer
        return FreelancerListSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_authenticators(self):
        if self.action in ['list', 'retrieve']:
            return []
        return super().get_authenticators()

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['get', 'put', 'patch'], url_path='me',
            permission_classes=[permissions.IsAuthenticated])
    def me(self, request):
        """Get or update the current user's freelancer profile."""
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
        """Submit a review for a freelancer (one per user)."""
        profile = self.get_object()
        if profile.user == request.user:
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
        """Return states that have active freelancer profiles."""
        from django.db.models import Count
        rows = (
            FreelancerProfile.objects
            .filter(is_active=True)
            .exclude(state='')
            .values('state')
            .annotate(count=Count('id'))
            .order_by('state')
        )
        return Response([{'state': r['state'], 'count': r['count']} for r in rows])

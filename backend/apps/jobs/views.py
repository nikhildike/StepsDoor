from django.db import models as db_models
from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import JobPost
from .serializers import JobPostSerializer


class JobPostViewSet(viewsets.ModelViewSet):
    serializer_class = JobPostSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['city', 'job_type', 'is_active', 'company']
    search_fields = ['title', 'description', 'location', 'city']
    ordering_fields = ['created_at', 'salary_min', 'salary_max', 'clicks']
    ordering = ['-created_at']

    def get_authenticators(self):
        if self.action in ['list', 'retrieve', 'track_click']:
            return []
        return super().get_authenticators()

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'track_click']:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        return JobPost.objects.filter(is_active=True).select_related('company')

    def perform_create(self, serializer):
        serializer.save(company=self.request.user.company)

    @action(detail=False, methods=['get'], url_path='my', permission_classes=[permissions.IsAuthenticated])
    def my_jobs(self, request):
        qs = JobPost.objects.filter(
            company__user=request.user
        ).select_related('company').order_by('-created_at')
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='track-click', permission_classes=[permissions.AllowAny])
    def track_click(self, request, pk=None):
        job = self.get_object()
        from apps.analytics.models import JobClick
        JobClick.objects.create(
            job_post=job,
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
        )
        JobPost.objects.filter(pk=job.pk).update(clicks=db_models.F('clicks') + 1)
        return Response({'redirect_url': job.redirect_url})

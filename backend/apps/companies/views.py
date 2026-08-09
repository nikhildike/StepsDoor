from rest_framework import viewsets, permissions, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.db.models import Count, Q

from .models import Company
from .serializers import CompanySerializer, CompanyPublicSerializer


class CompanyViewSet(viewsets.ModelViewSet):
    serializer_class = CompanySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Company.objects.all()

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['get', 'patch'], url_path='me')
    def me(self, request):
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
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    serializer_class = CompanyPublicSerializer

    def get_queryset(self):
        return (
            Company.objects
            .annotate(active_job_count=Count('jobs', filter=Q(jobs__is_active=True)))
            .filter(active_job_count__gt=0)
            .order_by('-active_job_count', 'name')
        )


class CompanyCareersView(generics.GenericAPIView):
    """Public career page — returns company info + all active jobs."""
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    serializer_class = CompanySerializer

    def get(self, request, slug):
        from apps.jobs.models import JobPost
        from apps.jobs.serializers import JobPostSerializer

        company = get_object_or_404(Company, slug=slug)
        jobs = JobPost.objects.filter(company=company, is_active=True).order_by('-created_at')
        return Response({
            'company': CompanySerializer(company).data,
            'jobs': JobPostSerializer(jobs, many=True).data,
        })

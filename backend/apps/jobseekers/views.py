from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import JobSeeker, SavedJob
from .serializers import JobSeekerSerializer, SavedJobSerializer


def _get_or_create_seeker(user):
    seeker, _ = JobSeeker.objects.get_or_create(user=user)
    return seeker


class JobSeekerViewSet(viewsets.ModelViewSet):
    serializer_class = JobSeekerSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return JobSeeker.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['get', 'patch'], url_path='me')
    def me(self, request):
        seeker = _get_or_create_seeker(request.user)
        if request.method == 'PATCH':
            # Allow updating user fields (first_name, last_name) and seeker phone
            user = request.user
            user.first_name = request.data.get('first_name', user.first_name)
            user.last_name = request.data.get('last_name', user.last_name)
            user.save(update_fields=['first_name', 'last_name'])
            serializer = self.get_serializer(seeker, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)
        return Response(self.get_serializer(seeker).data)


class SavedJobViewSet(viewsets.ModelViewSet):
    serializer_class = SavedJobSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return SavedJob.objects.filter(
            job_seeker__user=self.request.user
        ).select_related('job_post', 'job_post__company', 'job_seeker').order_by('-saved_at')

    def perform_create(self, serializer):
        seeker = _get_or_create_seeker(self.request.user)
        serializer.save(job_seeker=seeker)

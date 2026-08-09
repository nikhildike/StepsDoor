from rest_framework import viewsets, permissions

from .models import JobAlert
from .serializers import JobAlertSerializer


class JobAlertViewSet(viewsets.ModelViewSet):
    """Manage job alerts for job seekers."""
    serializer_class = JobAlertSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return JobAlert.objects.filter(
            job_seeker__user=self.request.user
        )

    def perform_create(self, serializer):
        from apps.jobseekers.models import JobSeeker
        job_seeker, _ = JobSeeker.objects.get_or_create(user=self.request.user)
        serializer.save(job_seeker=job_seeker)

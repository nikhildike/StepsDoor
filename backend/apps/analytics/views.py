from rest_framework import viewsets, permissions

from .models import JobClick
from .serializers import JobClickSerializer


class JobClickViewSet(viewsets.ModelViewSet):
    """Track and retrieve job click analytics."""
    serializer_class = JobClickSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return JobClick.objects.all()
        return JobClick.objects.filter(job_post__company__user=user)

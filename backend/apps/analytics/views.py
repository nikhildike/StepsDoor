"""API views for the `analytics` app. Backs the /api/analytics/clicks/
endpoints used to record job click-through events and to feed the
company analytics dashboard's click counts/trends."""

from rest_framework import viewsets, permissions

from .models import JobClick
from .serializers import JobClickSerializer


class JobClickViewSet(viewsets.ModelViewSet):
    """Track and retrieve job click analytics.

    Full CRUD over JobClick, mounted at /api/analytics/clicks/. Used both
    to log new click-through events and to let a company view the click
    history for jobs they own on their Analytics dashboard page.
    """
    serializer_class = JobClickSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Scope visible click records by caller: staff can see every
        click across all companies (for support/moderation), while a
        regular (company) user only sees clicks on job posts belonging to
        their own company, keeping analytics data private per company."""
        user = self.request.user
        if user.is_staff:
            return JobClick.objects.all()
        return JobClick.objects.filter(job_post__company__user=user)

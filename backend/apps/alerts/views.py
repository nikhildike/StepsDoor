"""API views for the `alerts` app. Backs the /api/alerts/ endpoints used by
the seeker-facing Alerts screen (web and mobile) to create and manage
saved job-alert criteria."""

from rest_framework import viewsets, permissions

from .models import JobAlert
from .serializers import JobAlertSerializer


class JobAlertViewSet(viewsets.ModelViewSet):
    """Manage job alerts for job seekers.

    Full CRUD (list/retrieve/create/update/destroy) over JobAlert, scoped to
    the authenticated user's own alerts. Mounted at /api/alerts/ and called
    from the seeker Alerts screen; the resulting JobAlert rows are later
    read by the Celery alert-matching task to decide who to notify about
    new job postings.
    """
    serializer_class = JobAlertSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Restrict every list/retrieve/update/delete to alerts owned by the
        current user, so job seekers can never see or modify another
        seeker's saved alerts."""
        return JobAlert.objects.filter(
            job_seeker__user=self.request.user
        )

    def perform_create(self, serializer):
        """Attach the alert to the caller's JobSeeker profile on create.

        Lazily gets-or-creates the JobSeeker profile (rather than requiring
        it to already exist) so a user can create their first alert even if
        no JobSeeker row has been provisioned for them yet; local import
        avoids a circular import between the alerts and jobseekers apps.
        """
        from apps.jobseekers.models import JobSeeker
        job_seeker, _ = JobSeeker.objects.get_or_create(user=self.request.user)
        serializer.save(job_seeker=job_seeker)

"""API views for the `jobseekers` app.

Exposes `JobSeekerViewSet` (profile management, including the `me`
convenience endpoint), `SavedJobViewSet` (bookmarking jobs of any kind) and
`SeekerStatsView` (dashboard counts). All are restricted to authenticated job seekers and always scoped to the
requesting user's own data.
"""
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import JobSeeker, SavedJob
from .serializers import JobSeekerSerializer, SavedJobSerializer


def _get_or_create_seeker(user):
    """Fetch the JobSeeker profile for a user, creating one if it doesn't exist yet.

    Called wherever a job-seeker-only endpoint needs the profile row
    (the `me` action, saving a job) since job seekers register as
    plain `User` accounts and don't get a `JobSeeker` row until their
    first profile-related or saved-job interaction.
    """
    seeker, _ = JobSeeker.objects.get_or_create(user=user)
    return seeker


class JobSeekerViewSet(viewsets.ModelViewSet):
    """CRUD + a `me` convenience action for the job seeker's own profile.

    Used by the seeker Profile page (web/mobile) to view and edit
    contact details. All access is restricted to the requesting
    user's own profile.
    """
    serializer_class = JobSeekerSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Scope results to only the requesting user's own JobSeeker row."""
        return JobSeeker.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        """Attach the profile to the authenticated request user.

        Called by DRF's CreateModelMixin after validation, so a
        profile can never be created under a different user's account.
        """
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['get', 'patch'], url_path='me')
    def me(self, request):
        """Fetch or update the current user's job-seeker profile in a single call.

        GET returns the profile (auto-creating it if this is the
        user's first visit to the profile page, since seekers don't
        get a JobSeeker row on registration). PATCH additionally
        updates the linked User's first/last name alongside the
        seeker's own fields (e.g. phone), since the frontend profile
        form edits both in one submission.
        """
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
    """CRUD for a job seeker's saved/bookmarked jobs.

    Backs the Saved Jobs page: listing bookmarks, saving a new job,
    and unsaving (delete) one. Always scoped to the requesting user's
    own bookmarks.
    """
    serializer_class = SavedJobSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Scope results to the requesting user's saved jobs, newest first.

        select_related pulls in every kind of saved job (and its company /
        careers source) in the same query, avoiding N+1 lookups when the
        serializer builds the display fields.
        """
        return SavedJob.objects.filter(
            job_seeker__user=self.request.user
        ).select_related(
            'job_post', 'job_post__company', 'career_job', 'career_job__source', 'govt_job', 'job_seeker',
        ).order_by('-saved_at')

    def create(self, request, *args, **kwargs):
        """Save a job (POST with one of job_post / career_job / govt_job); idempotent.

        Saving a job that's already saved returns the existing bookmark with
        200 instead of failing, so a double tap can't error. New bookmarks
        return 201. Uses `_get_or_create_seeker` because a user may save a job
        before ever visiting their profile page (no JobSeeker row yet).
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        seeker = _get_or_create_seeker(request.user)
        target = {f: v for f, v in serializer.validated_data.items() if f in ('job_post', 'career_job', 'govt_job')}
        saved, created = SavedJob.objects.get_or_create(job_seeker=seeker, **target)
        return Response(self.get_serializer(saved).data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class SeekerStatsView(APIView):
    """GET /api/jobseekers/stats/ — the numbers on the job seeker dashboard's stat cards.

    Returns:
        {
          "saved_jobs": int,           # the seeker's saved jobs (all kinds)
          "active_alerts": int,        # their job alerts that aren't paused
          "alert_matches": int,        # open jobs matching any active alert (each job once)
          "new_jobs_today": {"total", "job", "company", "govt"}  # open jobs added since midnight IST
        }
    Used by `frontend/src/pages/seeker/Overview.jsx`.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        """Compute the counts for the requesting user."""
        from apps.alerts.models import JobAlert
        from .listings import alert_match_querysets, collect_matches, new_today_counts

        alerts = list(JobAlert.objects.filter(job_seeker__user=request.user, is_active=True))
        matches = collect_matches([alert_match_querysets(a) for a in alerts], limit=0) if alerts else {'count': 0}
        return Response({
            'saved_jobs': SavedJob.objects.filter(job_seeker__user=request.user).count(),
            'active_alerts': len(alerts),
            'alert_matches': matches['count'],
            'new_jobs_today': new_today_counts(),
        })

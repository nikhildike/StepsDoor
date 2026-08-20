"""API views for the `jobseekers` app.

Exposes `JobSeekerViewSet` (profile management, including the `me`
convenience endpoint) and `SavedJobViewSet` (bookmarking jobs). Both
are restricted to authenticated job seekers and always scoped to the
requesting user's own data.
"""
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response

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

        select_related pulls in the job post, its company, and the
        seeker row in the same query to avoid N+1 lookups when
        serializing the denormalized job/company fields.
        """
        return SavedJob.objects.filter(
            job_seeker__user=self.request.user
        ).select_related('job_post', 'job_post__company', 'job_seeker').order_by('-saved_at')

    def perform_create(self, serializer):
        """Attach the bookmark to the authenticated user's seeker profile.

        Called by DRF's CreateModelMixin after validation. Uses
        `_get_or_create_seeker` because a user may save a job before
        ever visiting their profile page (no JobSeeker row yet). Note:
        actual save-then-save duplicate prevention is enforced by the
        `unique_together` constraint on SavedJob, not here — a repeat
        save attempt will raise a DB integrity error.
        """
        seeker = _get_or_create_seeker(self.request.user)
        serializer.save(job_seeker=seeker)

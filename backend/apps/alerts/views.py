"""API views for the `alerts` app. Backs the /api/alerts/ endpoints used by
the seeker-facing Alerts screen (web and mobile) to create and manage
saved job-alert criteria, and to list the open jobs each alert matches across
StepsDoor posts, company careers pages and government jobs."""

from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response

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

    def _limit(self, request):
        """`?limit=` (default 20, capped at 50): how many matching jobs to list."""
        try:
            return max(1, min(int(request.query_params.get('limit', 20)), 50))
        except ValueError:
            return 20

    @action(detail=True)
    def matches(self, request, pk=None):
        """GET /api/alerts/{id}/matches/ — open jobs this alert matches, newest first.

        Searches StepsDoor posts, company careers jobs and government jobs (see
        `apps.jobseekers.listings.alert_match_querysets` for the rules). Returns
        {count, counts: {job, company, govt}, results: [{kind, id, title, company,
        location, apply_url, posted_at, deadline}]}. Works for paused alerts too,
        so a seeker can preview one before switching it back on.
        """
        from apps.jobseekers.listings import alert_match_querysets, collect_matches
        return Response(collect_matches([alert_match_querysets(self.get_object())], self._limit(request)))

    @action(detail=False)
    def suggestions(self, request):
        """GET /api/alerts/suggestions/?q=dat — role keywords for the alert form's autocomplete.

        Returns [{keyword, count}]: phrases from open job titles (StepsDoor, company
        careers pages, govt jobs) starting with `q`, most common first, where `count`
        is how many open jobs' titles contain the phrase. See
        `apps.jobseekers.listings.keyword_suggestions`.
        """
        from apps.jobseekers.listings import keyword_suggestions
        return Response(keyword_suggestions(request.query_params.get('q', '')))

    @action(detail=False, url_path='matches')
    def all_matches(self, request):
        """GET /api/alerts/matches/ — open jobs matching any of the user's active alerts, each listed once.

        Same response shape as the per-alert `matches`. Used by the job seeker
        dashboard's "Jobs matching your alerts" section.
        """
        from apps.jobseekers.listings import alert_match_querysets, collect_matches
        alerts = self.get_queryset().filter(is_active=True)
        return Response(collect_matches([alert_match_querysets(a) for a in alerts], self._limit(request)))

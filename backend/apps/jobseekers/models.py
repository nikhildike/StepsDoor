"""Models for the `jobseekers` app.

Holds `JobSeeker` (the job-seeker-specific profile extending the base
`authentication.User`) and `SavedJob` (a job seeker's bookmark of a
`jobs.JobPost`, powering the "Saved Jobs" page).
"""
from django.db import models


class JobSeeker(models.Model):
    """Extra profile data for a user account acting as a job seeker.

    Created (lazily, via get_or_create) the first time a job seeker
    interacts with a job-seeker-only endpoint — e.g. viewing their
    profile or saving a job — since job seekers register as generic
    `User` accounts with no seeker profile required up front.
    """
    # One profile per user; deleting the user deletes the profile too.
    # related_name lets a User instance access user.job_seeker_profile.
    user = models.OneToOneField(
        'authentication.User',
        on_delete=models.CASCADE,
        related_name='job_seeker_profile',
    )
    phone = models.CharField(max_length=15, blank=True)  # Optional contact phone number; blank allowed since it's not collected at registration
    created_at = models.DateTimeField(auto_now_add=True)  # Timestamp the profile row was first created

    class Meta:
        verbose_name = 'Job Seeker'
        verbose_name_plural = 'Job Seekers'

    def __str__(self):
        """Human-readable label used in the Django admin and shell/debug output."""
        return f"{self.user.get_full_name() or self.user.username}"


class SavedJob(models.Model):
    """A bookmark linking a job seeker to a job post they've saved for later.

    Created when a job seeker taps "Save" on a listing; backs the
    Saved Jobs page in both the web and mobile job-seeker sections.
    """
    # The job seeker who saved the job; deleting the seeker profile removes their saved jobs.
    # related_name='saved_jobs' lets a JobSeeker instance access seeker.saved_jobs.all().
    job_seeker = models.ForeignKey(
        JobSeeker,
        on_delete=models.CASCADE,
        related_name='saved_jobs',
    )
    # The job post being saved; deleting the job post removes any bookmarks pointing to it.
    # related_name='saved_by' lets a JobPost instance access job.saved_by.all().
    job_post = models.ForeignKey(
        'jobs.JobPost',
        on_delete=models.CASCADE,
        related_name='saved_by',
    )
    saved_at = models.DateTimeField(auto_now_add=True)  # Timestamp the bookmark was created; used to order the Saved Jobs list newest-first

    class Meta:
        verbose_name = 'Saved Job'
        verbose_name_plural = 'Saved Jobs'
        # Prevents a job seeker from saving the same job post twice at the DB level;
        # this is the dedup mechanism — a duplicate save attempt raises an IntegrityError.
        unique_together = ('job_seeker', 'job_post')

    def __str__(self):
        """Human-readable label used in the Django admin and shell/debug output."""
        return f"{self.job_seeker} saved {self.job_post}"

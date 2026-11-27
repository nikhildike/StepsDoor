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
    """A bookmark linking a job seeker to a job they've saved for later.

    A job can be one of three kinds, and exactly one of the three job fields
    is set (enforced by a check constraint):
    - `job_post`: a StepsDoor job posted by a company/contractor (apps.jobs)
    - `career_job`: an opening read from a company's careers page (apps.careers)
    - `govt_job`: a government job opening (apps.govtjobs)

    Created when a job seeker taps "Save" on any job card; backs the Saved Jobs
    page and the dashboard's Saved Jobs count (web and mobile).
    """
    # The job seeker who saved the job; deleting the seeker profile removes their saved jobs.
    # related_name='saved_jobs' lets a JobSeeker instance access seeker.saved_jobs.all().
    job_seeker = models.ForeignKey(
        JobSeeker,
        on_delete=models.CASCADE,
        related_name='saved_jobs',
    )
    # A saved StepsDoor job post; deleting the post removes bookmarks pointing to it.
    job_post = models.ForeignKey(
        'jobs.JobPost',
        on_delete=models.CASCADE,
        related_name='saved_by',
        null=True,
        blank=True,
    )
    # A saved company careers-page opening. Closed openings stay saved (shown as closed).
    career_job = models.ForeignKey(
        'careers.CareerJob',
        on_delete=models.CASCADE,
        related_name='saved_by',
        null=True,
        blank=True,
    )
    # A saved government job opening. Expired ones stay saved (shown as closed).
    govt_job = models.ForeignKey(
        'govtjobs.GovtJob',
        on_delete=models.CASCADE,
        related_name='saved_by',
        null=True,
        blank=True,
    )
    saved_at = models.DateTimeField(auto_now_add=True)  # Timestamp the bookmark was created; used to order the Saved Jobs list newest-first

    class Meta:
        verbose_name = 'Saved Job'
        verbose_name_plural = 'Saved Jobs'
        constraints = [
            # Exactly one kind of job per bookmark.
            models.CheckConstraint(
                condition=(
                    models.Q(job_post__isnull=False, career_job__isnull=True, govt_job__isnull=True)
                    | models.Q(job_post__isnull=True, career_job__isnull=False, govt_job__isnull=True)
                    | models.Q(job_post__isnull=True, career_job__isnull=True, govt_job__isnull=False)
                ),
                name='savedjob_exactly_one_job',
            ),
            # A seeker can save each job only once (the API returns the existing bookmark instead).
            models.UniqueConstraint(fields=['job_seeker', 'job_post'], condition=models.Q(job_post__isnull=False),
                                    name='savedjob_unique_job_post'),
            models.UniqueConstraint(fields=['job_seeker', 'career_job'], condition=models.Q(career_job__isnull=False),
                                    name='savedjob_unique_career_job'),
            models.UniqueConstraint(fields=['job_seeker', 'govt_job'], condition=models.Q(govt_job__isnull=False),
                                    name='savedjob_unique_govt_job'),
        ]

    @property
    def kind(self):
        """Which kind of job this bookmark points at: 'job', 'company' or 'govt'."""
        if self.job_post_id:
            return 'job'
        return 'company' if self.career_job_id else 'govt'

    def __str__(self):
        """Human-readable label used in the Django admin and shell/debug output."""
        return f"{self.job_seeker} saved {self.job_post or self.career_job or self.govt_job}"

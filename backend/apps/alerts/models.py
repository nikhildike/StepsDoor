"""Models for the `alerts` app: saved job-alert criteria that job seekers
create from the mobile/web "Alerts" screen. A Celery task periodically (or
on new-job creation) matches active JobAlert rows against newly posted
JobPost records and dispatches email/push notifications for matches."""

from django.db import models


class JobAlert(models.Model):
    """A job seeker's saved search criteria for alerting on new job postings.

    Created via JobAlertViewSet (POST /api/alerts/) from the seeker's Alerts
    screen; consumed by the alert-matching Celery task, which filters newly
    created JobPost rows against each active alert's city/role_keyword/
    job_type/salary_min and notifies the owning job seeker on a match.
    """
    job_seeker = models.ForeignKey(
        'jobseekers.JobSeeker',
        on_delete=models.CASCADE,  # delete this alert if the owning job seeker profile is deleted
        related_name='job_alerts',  # access via job_seeker.job_alerts.all()
    )
    city = models.CharField(max_length=100, blank=True)  # optional city filter; blank = any city
    role_keyword = models.CharField(max_length=255, blank=True)  # optional free-text keyword matched against job title/role; blank = any role
    job_type = models.CharField(max_length=20, blank=True)  # optional job type filter (e.g. full-time/part-time); blank = any type
    salary_min = models.IntegerField(null=True, blank=True)  # optional minimum salary threshold; null = no minimum
    is_active = models.BooleanField(default=True)  # toggled off to pause matching/notifications without deleting the alert
    created_at = models.DateTimeField(auto_now_add=True)  # set once at creation, used for admin sorting/inspection

    class Meta:
        verbose_name = 'Job Alert'
        verbose_name_plural = 'Job Alerts'

    def __str__(self):
        """Human-readable label used in the Django admin list/detail views."""
        return f"Alert for {self.job_seeker} - {self.role_keyword or self.city}"

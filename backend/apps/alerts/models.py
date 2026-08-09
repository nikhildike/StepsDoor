from django.db import models


class JobAlert(models.Model):
    job_seeker = models.ForeignKey(
        'jobseekers.JobSeeker',
        on_delete=models.CASCADE,
        related_name='job_alerts',
    )
    city = models.CharField(max_length=100, blank=True)
    role_keyword = models.CharField(max_length=255, blank=True)
    job_type = models.CharField(max_length=20, blank=True)
    salary_min = models.IntegerField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Job Alert'
        verbose_name_plural = 'Job Alerts'

    def __str__(self):
        return f"Alert for {self.job_seeker} - {self.role_keyword or self.city}"

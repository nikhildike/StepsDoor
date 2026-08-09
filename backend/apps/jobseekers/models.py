from django.db import models


class JobSeeker(models.Model):
    user = models.OneToOneField(
        'authentication.User',
        on_delete=models.CASCADE,
        related_name='job_seeker_profile',
    )
    phone = models.CharField(max_length=15, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Job Seeker'
        verbose_name_plural = 'Job Seekers'

    def __str__(self):
        return f"{self.user.get_full_name() or self.user.username}"


class SavedJob(models.Model):
    job_seeker = models.ForeignKey(
        JobSeeker,
        on_delete=models.CASCADE,
        related_name='saved_jobs',
    )
    job_post = models.ForeignKey(
        'jobs.JobPost',
        on_delete=models.CASCADE,
        related_name='saved_by',
    )
    saved_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Saved Job'
        verbose_name_plural = 'Saved Jobs'
        unique_together = ('job_seeker', 'job_post')

    def __str__(self):
        return f"{self.job_seeker} saved {self.job_post}"

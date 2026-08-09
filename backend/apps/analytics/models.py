from django.db import models


class JobClick(models.Model):
    job_post = models.ForeignKey(
        'jobs.JobPost',
        on_delete=models.CASCADE,
        related_name='click_events',
    )
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    clicked_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Job Click'
        verbose_name_plural = 'Job Clicks'
        ordering = ['-clicked_at']

    def __str__(self):
        return f"Click on {self.job_post} at {self.clicked_at}"

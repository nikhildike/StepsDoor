from django.db import models


class JobPost(models.Model):
    TYPE_CHOICES = [
        ('full_time', 'Full Time'),
        ('part_time', 'Part Time'),
        ('contract', 'Contract'),
        ('internship', 'Internship'),
    ]

    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,
        related_name='jobs',
    )
    title = models.CharField(max_length=255)
    description = models.TextField()
    location = models.CharField(max_length=255)
    city = models.CharField(max_length=100)
    job_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    salary_min = models.IntegerField(null=True, blank=True)
    salary_max = models.IntegerField(null=True, blank=True)
    redirect_url = models.URLField()
    clicks = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = 'Job Post'
        verbose_name_plural = 'Job Posts'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} at {self.company}"

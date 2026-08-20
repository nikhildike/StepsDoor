"""Models for the `jobs` app.

Holds `JobPost`, the private job listing that a company creates under
its paid subscription. Job seekers browse these for free; applying is
handled off-platform by redirecting the seeker to the company's own
careers page (tracked via `track_click` in views.py, which increments
`clicks` on this model).
"""
from django.db import models


class JobPost(models.Model):
    """A single job listing posted by a subscribed company.

    Created by company users via the company dashboard (PostJob page)
    while they have an active subscription. Displayed to anonymous
    job seekers in job search/listing pages; clicking "Apply" redirects
    the seeker to `redirect_url` (the company's own careers page) and
    is recorded as a click via the `clicks` counter and a related
    `analytics.JobClick` event.
    """
    # Choices for job_type below; used to constrain the field to a fixed set of
    # employment types shown in filters and the post-job form.
    TYPE_CHOICES = [
        ('full_time', 'Full Time'),
        ('part_time', 'Part Time'),
        ('contract', 'Contract'),
        ('internship', 'Internship'),
    ]

    # The posting company; deleting a company cascades to remove its job posts.
    # related_name='jobs' lets a Company instance access company.jobs.all().
    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,
        related_name='jobs',
    )
    title = models.CharField(max_length=255)  # Job title, e.g. "Senior Backend Engineer"
    description = models.TextField()  # Full job description (rendered from TipTap rich text on the frontend)
    location = models.CharField(max_length=255)  # Free-text location detail (address/area), distinct from `city`
    city = models.CharField(max_length=100)  # City name, used for filtering/search in job listings
    job_type = models.CharField(max_length=20, choices=TYPE_CHOICES)  # Employment type, constrained to TYPE_CHOICES
    salary_min = models.IntegerField(null=True, blank=True)  # Lower end of salary range; optional since companies may withhold pay info
    salary_max = models.IntegerField(null=True, blank=True)  # Upper end of salary range; optional for the same reason as salary_min
    redirect_url = models.URLField()  # Company's own careers page/application URL; job seekers are redirected here to apply (no in-app applications)
    clicks = models.IntegerField(default=0)  # Running count of "apply" redirect clicks; incremented atomically in track_click, used for company analytics
    is_active = models.BooleanField(default=True)  # Whether the listing is currently visible to job seekers; toggled off instead of deleting to preserve click history
    created_at = models.DateTimeField(auto_now_add=True)  # Timestamp set once on creation; used for default ordering and alert matching windows
    expires_at = models.DateTimeField(null=True, blank=True)  # Optional expiry date after which the listing should stop being shown; null means no expiry set

    class Meta:
        verbose_name = 'Job Post'
        verbose_name_plural = 'Job Posts'
        ordering = ['-created_at']  # Newest listings first by default across the API and admin

    def __str__(self):
        """Human-readable label used in the Django admin and shell/debug output."""
        return f"{self.title} at {self.company}"

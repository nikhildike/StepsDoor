from django.db import models
from django.contrib.postgres.indexes import GinIndex
from django.contrib.postgres.search import SearchVectorField, SearchVector
from django.conf import settings


class GovtJobCategory(models.TextChoices):
    CIVIL_SERVICES = 'civil_services', 'Civil Services (UPSC/MPSC)'
    BANKING = 'banking', 'Banking (IBPS/SBI)'
    RAILWAY = 'railway', 'Railway (RRB)'
    POLICE = 'police', 'Police & Defence'
    TEACHING = 'teaching', 'Teaching & Education'
    HEALTHCARE = 'healthcare', 'Healthcare'
    PSU = 'psu', 'Public Sector Undertaking'
    STATE_GOVT = 'state_govt', 'State Government'
    OTHER = 'other', 'Other'


class GovtJob(models.Model):
    # Source identification
    source_portal = models.CharField(max_length=100, db_index=True)
    job_id = models.CharField(max_length=200)

    # Core fields
    title = models.CharField(max_length=500)
    organisation = models.CharField(max_length=500)
    state = models.CharField(max_length=100, blank=True, db_index=True)  # blank = central govt
    category = models.CharField(
        max_length=50,
        choices=GovtJobCategory.choices,
        default=GovtJobCategory.OTHER,
        db_index=True,
    )

    # Job details
    qualification = models.CharField(max_length=500, blank=True)
    vacancy_count = models.IntegerField(null=True, blank=True)
    age_limit = models.CharField(max_length=100, blank=True)
    salary_range = models.CharField(max_length=200, blank=True)

    # Key dates
    application_start = models.DateTimeField(null=True, blank=True)
    application_deadline = models.DateTimeField(null=True, blank=True, db_index=True)
    exam_date = models.DateTimeField(null=True, blank=True)

    # Links
    source_url = models.URLField(max_length=1000)
    notification_pdf_url = models.URLField(max_length=1000, blank=True)

    is_active = models.BooleanField(default=True, db_index=True)
    published_at = models.DateTimeField(db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    search_vector = SearchVectorField(null=True, blank=True)

    class Meta:
        unique_together = ('source_portal', 'job_id')
        indexes = [GinIndex(fields=['search_vector'])]
        ordering = ['-published_at']

    def __str__(self):
        return f"{self.title} — {self.organisation}"

    def save(self, *args, **kwargs):
        if 'postgresql' in settings.DATABASES['default']['ENGINE']:
            self.search_vector = (
                SearchVector('title', weight='A') +
                SearchVector('organisation', weight='B') +
                SearchVector('qualification', weight='C')
            )
        super().save(*args, **kwargs)


class GovtJobAlert(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='govtjob_alerts',
    )
    keyword = models.CharField(max_length=255, blank=True)
    state = models.CharField(max_length=100, blank=True)
    category = models.CharField(max_length=50, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        parts = [self.keyword, self.state, self.category]
        label = ' | '.join(p for p in parts if p) or 'All govt jobs'
        return f"{self.user} — {label}"

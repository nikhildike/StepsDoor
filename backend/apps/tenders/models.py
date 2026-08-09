from django.db import models
from django.contrib.postgres.indexes import GinIndex
from django.contrib.postgres.search import SearchVectorField, SearchVector, SearchQuery, SearchRank
from django.conf import settings


class TenderCategory(models.TextChoices):
    CIVIL = 'civil', 'Civil Works'
    IT = 'it', 'IT & Software'
    SUPPLY = 'supply', 'Supply of Goods'
    TRANSPORT = 'transport', 'Transport'
    HEALTHCARE = 'healthcare', 'Healthcare'
    EDUCATION = 'education', 'Education'
    DEFENCE = 'defence', 'Defence'
    POWER = 'power', 'Power & Energy'
    OTHER = 'other', 'Other'


class Tender(models.Model):
    # Source identification — unique together prevents duplicates across re-scrapes
    source_portal = models.CharField(max_length=100, db_index=True)
    tender_id = models.CharField(max_length=200)  # NIT / reference number (dedup key)
    reference_number = models.CharField(max_length=300, blank=True)  # NIC system Tender ID from detail page

    # Core fields
    title = models.CharField(max_length=500)
    description = models.TextField(blank=True)
    organisation = models.CharField(max_length=500)
    state = models.CharField(max_length=100, db_index=True)
    district = models.CharField(max_length=100, blank=True)
    category = models.CharField(
        max_length=50,
        choices=TenderCategory.choices,
        default=TenderCategory.OTHER,
        db_index=True,
    )

    # Financial details (all optional — not all portals disclose these)
    estimated_value = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    document_fee = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    emd_amount = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)

    # Dates
    published_at = models.DateTimeField()
    submission_deadline = models.DateTimeField(null=True, blank=True, db_index=True)
    opening_date = models.DateTimeField(null=True, blank=True)

    # Links back to the official portal
    source_url = models.URLField(max_length=1000)
    document_url = models.URLField(max_length=1000, blank=True)

    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # PostgreSQL full-text search vector (populated on save)
    search_vector = SearchVectorField(null=True, blank=True)

    class Meta:
        unique_together = ('source_portal', 'tender_id')
        indexes = [GinIndex(fields=['search_vector'])]
        ordering = ['-published_at']

    def __str__(self):
        return f"{self.title} ({self.source_portal})"

    def save(self, *args, **kwargs):
        # Only update search_vector when using PostgreSQL
        if 'postgresql' in settings.DATABASES['default']['ENGINE']:
            self.search_vector = (
                SearchVector('title', weight='A') +
                SearchVector('organisation', weight='B') +
                SearchVector('description', weight='C')
            )
        super().save(*args, **kwargs)


class TenderAlert(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='tender_alerts',
    )
    keyword = models.CharField(max_length=255, blank=True)
    state = models.CharField(max_length=100, blank=True)
    category = models.CharField(max_length=50, blank=True)
    min_value = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        parts = [self.keyword, self.state, self.category]
        label = ' | '.join(p for p in parts if p) or 'All tenders'
        return f"{self.user} — {label}"


class ScraperSource(models.Model):
    """
    Registry of government portal URLs — both tender portals and govt job portals.

    Admin only needs to provide the URL and source_type. Everything else is auto-derived:
      - source_portal  ← domain extracted from the URL
      - name           ← domain (if left blank)
      - spider_name    ← defaults to 'generic_tender' or 'generic_govtjob' based on source_type

    The generic spiders handle most Indian government portals that run on NIC eProcurement
    or similar standard software.
    """

    TYPE_TENDER   = 'tender'
    TYPE_GOVT_JOB = 'govt_job'
    SOURCE_TYPE_CHOICES = [
        (TYPE_TENDER,   'Government Tender'),
        (TYPE_GOVT_JOB, 'Government Job'),
    ]

    url = models.URLField(unique=True, help_text="Portal listing page URL (only required field)")
    source_type = models.CharField(
        max_length=20, choices=SOURCE_TYPE_CHOICES, default=TYPE_TENDER, db_index=True,
    )
    source_portal = models.CharField(
        max_length=100, db_index=True, blank=True,
        help_text="Auto-derived from URL domain. Used as dedup key in Tender/GovtJob records.",
    )
    name = models.CharField(max_length=200, blank=True, help_text="Auto-set to domain if left blank.")
    spider_name = models.CharField(
        max_length=100, blank=True,
        help_text="Scrapy spider name. Auto-set from source_type if left blank.",
    )
    state = models.CharField(max_length=100, blank=True,
        help_text="State this portal covers (leave blank for national portals).")
    is_active = models.BooleanField(default=True)
    last_scraped_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['source_type', 'name']
        verbose_name = 'Scraper Source'
        verbose_name_plural = 'Scraper Sources'

    def save(self, *args, **kwargs):
        from urllib.parse import urlparse
        domain = urlparse(self.url).netloc.lower().removeprefix('www.')
        if not self.source_portal:
            self.source_portal = domain
        if not self.name:
            self.name = domain
        if not self.spider_name:
            self.spider_name = 'generic_tender' if self.source_type == self.TYPE_TENDER else 'generic_govtjob'
        super().save(*args, **kwargs)

    def __str__(self):
        return f"[{self.get_source_type_display()}] {self.name}"


class ScraperLog(models.Model):
    class Status(models.TextChoices):
        RUNNING = 'running', 'Running'
        SUCCESS = 'success', 'Success'
        PARTIAL = 'partial', 'Partial'
        FAILED = 'failed', 'Failed'

    portal = models.CharField(max_length=100)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.RUNNING)
    tenders_found = models.IntegerField(default=0)
    tenders_new = models.IntegerField(default=0)
    error_message = models.TextField(blank=True)
    started_at = models.DateTimeField(auto_now_add=True)
    finished_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-started_at']

    def __str__(self):
        return f"{self.portal} — {self.status} @ {self.started_at:%Y-%m-%d %H:%M}"

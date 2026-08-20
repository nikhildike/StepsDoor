"""
Models for the `govtjobs` app.

Defines `GovtJob` — a government job listing scraped/fetched from portals
like the NCS API and state recruitment sites via the Celery scraping pipeline
in `tasks.py` (scrape_all_govtjob_portals -> scrape_govtjob_portal ->
GovtJobPipeline -> update_or_create on this model) — and `GovtJobAlert`,
a saved search a job seeker can register to be notified about matching new
listings (matched by `tasks.match_govtjob_alerts`).
"""
from django.db import models
from django.contrib.postgres.indexes import GinIndex
from django.contrib.postgres.search import SearchVectorField, SearchVector
from django.conf import settings


class GovtJobCategory(models.TextChoices):
    """Enumerates the broad categories a government job listing can be tagged with.

    Used as the `choices` for `GovtJob.category` so listings can be
    filtered/faceted (e.g. "Banking (IBPS/SBI)", "Railway (RRB)").
    """
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
    """A single government job listing, sourced from a scraper or the NCS API.

    Rows are created/refreshed idempotently by `GovtJobPipeline.process_item()`
    (called from the Scrapy pipeline during `tasks.scrape_govtjob_portal`) via
    `update_or_create` keyed on the dedup pair (`source_portal`, `job_id`) — so
    re-scraping the same portal updates existing rows instead of duplicating
    them. Read-only from the public API (`GovtJobViewSet` is a
    ReadOnlyModelViewSet); job seekers only browse/search these.
    """
    # Source identification
    source_portal = models.CharField(max_length=100, db_index=True)  # Which portal/spider this job came from (e.g. 'ncs', 'mahatenders'); indexed for filtering and part of the dedup key
    job_id = models.CharField(max_length=200)  # The job's identifier as given by the source portal; combined with source_portal forms the dedup key (see unique_together below)

    # Core fields
    title = models.CharField(max_length=500)  # Job title/post name
    organisation = models.CharField(max_length=500)  # Recruiting department/organisation name
    state = models.CharField(max_length=100, blank=True, db_index=True)  # blank = central govt  # Indexed since listings are commonly filtered/faceted by state
    category = models.CharField(
        max_length=50,
        choices=GovtJobCategory.choices,
        default=GovtJobCategory.OTHER,
        db_index=True,  # Indexed since listings are commonly filtered by category
    )

    # Job details
    qualification = models.CharField(max_length=500, blank=True)  # Minimum educational qualification required; optional, not always available from source
    vacancy_count = models.IntegerField(null=True, blank=True)  # Number of open positions; nullable since some notifications don't specify a count
    age_limit = models.CharField(max_length=100, blank=True)  # Free-text age eligibility criteria (varies too much across portals for a structured field)
    salary_range = models.CharField(max_length=200, blank=True)  # Free-text pay scale/salary range as published by the source

    # Key dates
    application_start = models.DateTimeField(null=True, blank=True)  # When applications open; nullable since not always published
    application_deadline = models.DateTimeField(null=True, blank=True, db_index=True)  # Last date to apply; indexed since listings are commonly sorted/filtered by deadline
    exam_date = models.DateTimeField(null=True, blank=True)  # Scheduled exam date, if known at scrape time

    # Links
    source_url = models.URLField(max_length=1000)  # Link back to the original listing on the source portal
    notification_pdf_url = models.URLField(max_length=1000, blank=True)  # Link to the official notification PDF, when available

    is_active = models.BooleanField(default=True, db_index=True)  # Whether the listing is still current; indexed since every public queryset filters on it
    published_at = models.DateTimeField(db_index=True)  # When the job was originally published by the source; indexed for ordering and recency filters
    created_at = models.DateTimeField(auto_now_add=True)  # When this row was first scraped/inserted into our DB
    updated_at = models.DateTimeField(auto_now=True)  # When this row was last refreshed by a re-scrape

    # Full-text search vector; only ever populated when running on PostgreSQL (see save() below) — on SQLite (dev) it stays null and search falls back to DRF's SearchFilter
    search_vector = SearchVectorField(null=True, blank=True)

    class Meta:
        # Dedup key: a given source portal's job_id must be unique, so re-scrapes
        # update the existing row instead of creating duplicates
        unique_together = ('source_portal', 'job_id')
        indexes = [GinIndex(fields=['search_vector'])]  # GIN index required for efficient PostgreSQL full-text search queries against search_vector
        ordering = ['-published_at']

    def __str__(self):
        """Human-readable representation used in the admin and shell, e.g. "title — organisation"."""
        return f"{self.title} — {self.organisation}"

    def save(self, *args, **kwargs):
        """Persist the row, (re)computing the full-text search vector on PostgreSQL.

        Called on every create/update (including from GovtJobPipeline during
        scraping). Only populates `search_vector` when the configured database
        is PostgreSQL, since SQLite (used in dev) has no SearchVectorField
        support — weighting title highest (A), organisation next (B), and
        qualification lowest (C) so title matches rank above incidental matches.
        """
        if 'postgresql' in settings.DATABASES['default']['ENGINE']:
            self.search_vector = (
                SearchVector('title', weight='A') +
                SearchVector('organisation', weight='B') +
                SearchVector('qualification', weight='C')
            )
        super().save(*args, **kwargs)


class GovtJobAlert(models.Model):
    """A job seeker's saved search for new government job listings.

    Created via `GovtJobAlertViewSet` when a user wants to be notified about
    new listings matching a keyword/state/category; matched against recently
    scraped jobs by the Celery task `tasks.match_govtjob_alerts`.
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='govtjob_alerts',  # Lets User.govtjob_alerts list a user's saved alerts
    )
    keyword = models.CharField(max_length=255, blank=True)  # Optional keyword to match against job title/organisation; blank means no keyword filter
    state = models.CharField(max_length=100, blank=True)  # Optional state filter; blank means match jobs in any state
    category = models.CharField(max_length=50, blank=True)  # Optional category filter; blank means match any category
    is_active = models.BooleanField(default=True)  # Whether this alert is currently enabled; inactive alerts are skipped by match_govtjob_alerts
    created_at = models.DateTimeField(auto_now_add=True)  # When the alert was first created

    def __str__(self):
        """Human-readable representation, e.g. "user — keyword | state | category" or "user — All govt jobs" when no filters are set."""
        parts = [self.keyword, self.state, self.category]
        label = ' | '.join(p for p in parts if p) or 'All govt jobs'
        return f"{self.user} — {label}"

"""
Models for the `tenders` app.

Defines the data layer for the government-tenders pipeline:
  - `Tender`         — a single scraped tender listing, deduplicated per portal.
  - `TenderAlert`     — a job seeker's saved search that new tenders are matched against
                         (see `apps.tenders.tasks.match_tender_alerts`).
  - `ScraperSource`   — the DB-driven registry of portals to scrape (both tender and govt
                         job portals), read by `apps.tenders.tasks.scrape_all_portals` /
                         `scrape_portal` and by `run_scrapers` management command.
  - `ScraperLog`      — a per-run audit record written by `scrape_portal` so admins can see
                         scrape health without digging through Celery/worker logs.

These models sit at the center of the pipeline described in CLAUDE.md:
Celery Beat -> scrape_all_portals -> scrape_portal -> spider -> TenderPipeline.process_item()
(update_or_create on Tender) -> ScraperLog updated -> match_tender_alerts -> notifications.
"""
from django.db import models
from django.contrib.postgres.indexes import GinIndex
from django.contrib.postgres.search import SearchVectorField, SearchVector, SearchQuery, SearchRank
from django.conf import settings


class TenderCategory(models.TextChoices):
    """
    Fixed set of tender categories used to classify listings for filtering/search.

    Assigned by the scraper pipeline (or left as OTHER when a portal's category text
    doesn't map cleanly) and used as a `choices` constraint on `Tender.category` and as a
    filter option on `TenderAlert` / the tenders list API.
    """
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
    """
    A single government tender listing scraped from a public procurement portal.

    Created/updated by `TenderPipeline.process_item()` in `scrapers/pipelines.py` via
    `Tender.objects.update_or_create(source_portal=..., tender_id=..., defaults={...})`
    each time `scrape_portal` runs a spider for an active `ScraperSource` — so re-running the
    same portal never creates duplicate rows, it just refreshes the existing one. Read-only
    for API consumers via `TenderViewSet` (job seekers browse tenders for free); never created
    or edited directly through the API.
    """
    # Source identification — unique together (see Meta) prevents duplicates across re-scrapes
    source_portal = models.CharField(max_length=100, db_index=True)  # domain of the portal this was scraped from, e.g. "mahatenders.gov.in"; matches ScraperSource.source_portal
    tender_id = models.CharField(max_length=200)  # NIT / reference number as shown on the portal — combined with source_portal this is the dedup key used by update_or_create()
    reference_number = models.CharField(max_length=300, blank=True)  # NIC system Tender ID pulled from the tender's detail page (separate from tender_id/NIT; not all portals expose it, hence blank=True)

    # Core fields
    title = models.CharField(max_length=500)  # tender title/short description as published on the portal
    description = models.TextField(blank=True)  # longer free-text description, when the portal provides one (blank=True since many portals don't)
    organisation = models.CharField(max_length=500)  # issuing government body/department
    state = models.CharField(max_length=100, db_index=True)  # Indian state the tender belongs to; indexed since it's a primary filter on the public tenders list
    district = models.CharField(max_length=100, blank=True)  # district within the state, when disclosed by the portal
    category = models.CharField(
        max_length=50,
        choices=TenderCategory.choices,  # restricts values to the TenderCategory enum above
        default=TenderCategory.OTHER,  # scrapers/admin fall back to OTHER when a portal's raw category text can't be mapped
        db_index=True,  # indexed — category is a common filter on the public tenders API
    )

    # Financial details (all optional — not all portals disclose these)
    estimated_value = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)  # tender's estimated contract value, in INR; null when the portal doesn't publish it
    document_fee = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)  # cost to purchase/download tender documents, in INR, if any
    emd_amount = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)  # Earnest Money Deposit bidders must submit, in INR, if any

    # Dates
    published_at = models.DateTimeField()  # when the tender was published on the source portal (required — used for default ordering and alert-window logic)
    submission_deadline = models.DateTimeField(null=True, blank=True, db_index=True)  # bid submission cutoff; indexed since the API sorts/filters on it and it's a key "closing soon" query; nullable because some portals omit it
    opening_date = models.DateTimeField(null=True, blank=True)  # scheduled bid-opening date, when published

    # Links back to the official portal
    source_url = models.URLField(max_length=1000)  # canonical detail-page URL on the source portal; job seekers are sent here to view/apply
    document_url = models.URLField(max_length=1000, blank=True)  # direct link to tender documents, when the portal exposes one

    is_active = models.BooleanField(default=True, db_index=True)  # soft "still open/visible" flag; indexed because every public list query filters is_active=True
    created_at = models.DateTimeField(auto_now_add=True)  # row-creation timestamp (i.e. first time this tender was scraped) — used by match_tender_alerts to find "new" tenders
    updated_at = models.DateTimeField(auto_now=True)  # last time update_or_create() touched this row (i.e. most recent re-scrape)

    # PostgreSQL full-text search vector (populated on save)
    search_vector = SearchVectorField(null=True, blank=True)  # GIN-indexed tsvector for Postgres full-text search; left null on SQLite where search falls back to DRF's SearchFilter instead

    class Meta:
        unique_together = ('source_portal', 'tender_id')  # enforces the dedup key: one row per (portal, tender_id) pair, matching TenderPipeline's update_or_create() lookup
        indexes = [GinIndex(fields=['search_vector'])]  # GIN index enables fast Postgres full-text queries against search_vector
        ordering = ['-published_at']  # default: newest tenders first

    def __str__(self):
        """Human-readable label for Django admin lists and shell/debug output."""
        return f"{self.title} ({self.source_portal})"

    def save(self, *args, **kwargs):
        """
        Persist the tender, refreshing `search_vector` first when running on PostgreSQL.

        SQLite (used in local dev) has no full-text search extension, so `search_vector`
        is left null there and the tenders API falls back to DRF's `SearchFilter`
        (basic icontains) instead — this check keeps save() safe to call on either backend.
        Called both by direct model usage and by `TenderPipeline.process_item()`'s
        `update_or_create()` during every scrape run.
        """
        # Only update search_vector when using PostgreSQL — SearchVector/GIN indexing
        # is a Postgres-only feature and would raise on SQLite.
        if 'postgresql' in settings.DATABASES['default']['ENGINE']:
            self.search_vector = (
                SearchVector('title', weight='A') +
                SearchVector('organisation', weight='B') +
                SearchVector('description', weight='C')
            )
        super().save(*args, **kwargs)


class TenderAlert(models.Model):
    """
    A saved search that lets a job seeker get notified about new matching tenders.

    Created/managed by the user via `TenderAlertViewSet` (their own alerts only). Read by
    the `match_tender_alerts` Celery task, which runs each alert's filters against tenders
    created in the last 24 hours and (eventually) dispatches a notification for matches.
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,  # delete the user's alerts if their account is deleted
        related_name='tender_alerts',  # lets a User instance access alerts via user.tender_alerts
    )
    keyword = models.CharField(max_length=255, blank=True)  # free-text match against Tender.title/organisation (icontains); blank = no keyword filter
    state = models.CharField(max_length=100, blank=True)  # restrict matches to this state; blank = any state
    category = models.CharField(max_length=50, blank=True)  # restrict matches to this TenderCategory value; blank = any category (not a FK/choices field since it's an optional filter, not authoritative data)
    min_value = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)  # only match tenders with estimated_value >= this; null = no minimum
    is_active = models.BooleanField(default=True)  # lets a user pause an alert without deleting it; match_tender_alerts only considers is_active=True rows
    created_at = models.DateTimeField(auto_now_add=True)  # when the alert was created

    def __str__(self):
        """Human-readable summary of the alert's filters, for Django admin lists."""
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

    TYPE_TENDER   = 'tender'  # this source publishes tender listings, scraped into Tender via apps.tenders.tasks
    TYPE_GOVT_JOB = 'govt_job'  # this source publishes government job listings, scraped into GovtJob via apps.govtjobs.tasks
    SOURCE_TYPE_CHOICES = [
        (TYPE_TENDER,   'Government Tender'),
        (TYPE_GOVT_JOB, 'Government Job'),
    ]

    url = models.URLField(unique=True, help_text="Portal listing page URL (only required field)")  # the only field an admin must fill in; unique so the same portal can't be registered twice; passed to the spider as start_url
    source_type = models.CharField(
        max_length=20, choices=SOURCE_TYPE_CHOICES, default=TYPE_TENDER, db_index=True,  # indexed — scrape_all_portals / scrape_all_govtjob_portals each filter on this to pick their queue of sources
    )
    source_portal = models.CharField(
        max_length=100, db_index=True, blank=True,
        # Auto-derived in save() from the URL's domain (see below) — left blank=True in the
        # form/import because admins never type it directly. This value becomes the
        # source_portal used as half of Tender's dedup key (source_portal, tender_id) and
        # is what scrape_portal()/scrape_govtjob_portal() look up sources by.
        help_text="Auto-derived from URL domain. Used as dedup key in Tender/GovtJob records.",
    )
    name = models.CharField(max_length=200, blank=True, help_text="Auto-set to domain if left blank.")  # display name shown in admin; auto-set to the domain in save() if the admin leaves it empty
    spider_name = models.CharField(
        max_length=100, blank=True,
        # Auto-set in save() to 'generic_tender' or 'generic_govtjob' based on source_type
        # when left blank — the generic spiders handle most NIC-eProcurement-style portals.
        # Admins only set this explicitly when a portal needs a custom spider (e.g. 'mahatenders').
        help_text="Scrapy spider name. Auto-set from source_type if left blank.",
    )
    state = models.CharField(max_length=100, blank=True,
        help_text="State this portal covers (leave blank for national portals).")  # optional metadata for state-specific portals; not used for filtering scrape queues
    is_active = models.BooleanField(default=True)  # only active sources are scraped by scrape_all_portals/scrape_all_govtjob_portals or picked up by run_scrapers
    last_scraped_at = models.DateTimeField(null=True, blank=True)  # stamped by scrape_portal() after a successful run; null until the first successful scrape
    notes = models.TextField(blank=True)  # free-text admin notes (e.g. quirks of this portal, known issues)
    created_at = models.DateTimeField(auto_now_add=True)  # when this source was registered

    class Meta:
        ordering = ['source_type', 'name']
        verbose_name = 'Scraper Source'
        verbose_name_plural = 'Scraper Sources'

    def save(self, *args, **kwargs):
        """
        Persist the source, auto-deriving `source_portal`, `name`, and `spider_name` from
        the URL/source_type whenever those fields are left blank.

        This is what lets admin onboarding of a standard NIC-eProcurement-style portal be
        just "paste a URL, pick tender or govt_job" — no other fields required. Called both
        from the Django admin (`/admin/tenders/scrapersource/`, including the bulk-add-urls
        view) and from `ScraperSourceResource` CSV/Excel imports.
        """
        from urllib.parse import urlparse
        domain = urlparse(self.url).netloc.lower().removeprefix('www.')
        if not self.source_portal:
            self.source_portal = domain  # e.g. "https://mahatenders.gov.in/..." -> "mahatenders.gov.in"
        if not self.name:
            self.name = domain
        if not self.spider_name:
            self.spider_name = 'generic_tender' if self.source_type == self.TYPE_TENDER else 'generic_govtjob'
        super().save(*args, **kwargs)

    def __str__(self):
        """Human-readable label for Django admin lists, e.g. "[Government Tender] mahatenders.gov.in"."""
        return f"[{self.get_source_type_display()}] {self.name}"


class ScraperLog(models.Model):
    """
    Audit record for a single scrape run of one portal.

    Created by `apps.tenders.tasks.scrape_portal` at the start of each run (status=RUNNING)
    and updated to SUCCESS/FAILED once the spider finishes (or raises). Read-only in the
    Django admin (`ScraperLogAdmin.has_add_permission` returns False) — it exists purely so
    admins can monitor scrape health without tailing Celery worker logs.
    """
    class Status(models.TextChoices):
        """Lifecycle states a scrape run can be in; also used by GovtJob's equivalent log."""
        RUNNING = 'running', 'Running'  # set when ScraperLog.objects.create() runs, before the spider starts
        SUCCESS = 'success', 'Success'  # set when the spider process completes without raising
        PARTIAL = 'partial', 'Partial'  # reserved for runs that complete but with some items failing (not currently set by scrape_portal, which only sets SUCCESS/FAILED)
        FAILED = 'failed', 'Failed'  # set in the except block of scrape_portal when the crawl raises

    portal = models.CharField(max_length=100)  # source_portal this run scraped, e.g. "mahatenders.gov.in"
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.RUNNING)  # current lifecycle state, see Status above
    tenders_found = models.IntegerField(default=0)  # total items the spider yielded this run (not currently populated by scrape_portal — reserved for future pipeline stats)
    tenders_new = models.IntegerField(default=0)  # count of items that were newly created (vs. updated) this run (not currently populated by scrape_portal — reserved for future pipeline stats)
    error_message = models.TextField(blank=True)  # exception text captured when status=FAILED, for admin debugging
    started_at = models.DateTimeField(auto_now_add=True)  # stamped when the log row is created, i.e. run start
    finished_at = models.DateTimeField(null=True, blank=True)  # stamped in scrape_portal's finally block; null while status=RUNNING

    class Meta:
        ordering = ['-started_at']  # most recent runs first, for the admin log list

    def __str__(self):
        """Human-readable summary for Django admin lists, e.g. "mahatenders.gov.in — success @ 2026-08-18 06:00"."""
        return f"{self.portal} — {self.status} @ {self.started_at:%Y-%m-%d %H:%M}"

"""Models for private-company careers-page jobs.

Deliberately separate from `apps.govtjobs`: these are private employers'
openings read from their own ATS feeds (Greenhouse, Lever, Workday, Oracle),
shown to signed-in job seekers on the Companies page. We store only the facts
needed to list a job (title, location, dates, apply link) and send seekers to
the company's own apply page — never full job descriptions.
"""
from django.db import models


class CareerSource(models.Model):
    """One company's careers feed: which ATS it uses and the company's id on that ATS.

    Created by `import_career_sources` from the classifier's CSV (or by hand
    in admin), fetched by `apps.careers.sync.sync_source` from the
    twice-daily `fetch_all_career_sources` task. Switching `is_active` off
    stops fetching and hides the company's jobs (e.g. on a removal request).
    """

    class Ats(models.TextChoices):
        """ATS platforms we have an adapter for (see `apps.careers.adapters`)."""
        GREENHOUSE = 'greenhouse', 'Greenhouse'
        LEVER = 'lever', 'Lever'
        WORKDAY = 'workday', 'Workday'
        ORACLE_HCM = 'oracle_hcm', 'Oracle Recruiting Cloud'

    class Status(models.TextChoices):
        """Outcome of the latest fetch."""
        OK = 'ok', 'OK'
        FAILED = 'failed', 'Failed'

    company_name = models.CharField(max_length=255)  # Employer name shown on every job card
    sector = models.CharField(max_length=100, blank=True)  # Directory sector (e.g. 'Fintech'), used as a filter
    careers_url = models.URLField(max_length=500)  # The company's public careers page (for "all openings" links)
    ats = models.CharField(max_length=20, choices=Ats.choices)  # Which adapter reads this feed
    # Company id on the ATS. Greenhouse/Lever: board slug ('razorpay'); Workday:
    # 'host/site' ('accenture.wd103.myworkdayjobs.com/AccentureCareers');
    # Oracle: 'host/siteNumber' ('fa-etvl-saasfaprod1.fa.ocs.oraclecloud.com/CX_1').
    ats_slug = models.CharField(max_length=300)
    is_active = models.BooleanField(default=True)  # Off = not fetched and its jobs hidden from seekers
    last_fetched_at = models.DateTimeField(null=True, blank=True)  # When the last successful fetch finished
    last_status = models.CharField(max_length=10, choices=Status.choices, blank=True)  # Result of the most recent fetch attempt
    last_error = models.TextField(blank=True)  # Error text from the most recent failed fetch ('' after a success)
    consecutive_failures = models.PositiveIntegerField(default=0)  # Failed fetches in a row; a streak usually means the ATS changed
    created_at = models.DateTimeField(auto_now_add=True)  # When the source was registered
    updated_at = models.DateTimeField(auto_now=True)  # Last change to the row (including fetch bookkeeping)

    class Meta:
        ordering = ['company_name']
        constraints = [
            models.UniqueConstraint(fields=['ats', 'ats_slug'], name='careers_unique_source'),
        ]

    def __str__(self):
        """Admin label: company and ATS, e.g. 'Razorpay (Greenhouse)'."""
        return f'{self.company_name} ({self.get_ats_display()})'


class CareerJob(models.Model):
    """One open position read from a `CareerSource` feed.

    Keyed by `(source, external_id)` so each fetch updates jobs in place.
    A job missing from the latest successful fetch is set `is_active=False`
    rather than deleted, so a temporarily missing job comes back with its
    original `first_seen_at`.
    """
    source = models.ForeignKey(CareerSource, on_delete=models.CASCADE, related_name='jobs')  # Feed (and company) this job came from
    external_id = models.CharField(max_length=200)  # The ATS's own job/requisition id, unique within a source
    title = models.CharField(max_length=300)  # Job title as the company lists it
    location = models.CharField(max_length=300, blank=True)  # Location text as listed (city, or several cities)
    # Standard city names found in `location`, stored as '|Bengaluru|Pune|' (see apps.careers.cities);
    # '' when the location names only a state or 'India'. Set by sync_source; drives the city filter.
    cities = models.CharField(max_length=500, blank=True, db_index=True)
    department = models.CharField(max_length=200, blank=True)  # Team/department/job family, when the ATS gives one
    employment_type = models.CharField(max_length=100, blank=True)  # Full-time / Intern / Contract..., when given
    apply_url = models.URLField(max_length=1000)  # The job's page on the company's ATS, where seekers apply
    posted_at = models.DateTimeField(null=True, blank=True)  # When the company published it (Workday: approximate, from "Posted 3 Days Ago")
    first_seen_at = models.DateTimeField(auto_now_add=True)  # When StepsDoor first saw it
    last_seen_at = models.DateTimeField()  # Last fetch that still listed it
    is_active = models.BooleanField(default=True, db_index=True)  # False once it disappears from the company's feed

    class Meta:
        ordering = ['-posted_at', '-first_seen_at']
        constraints = [
            models.UniqueConstraint(fields=['source', 'external_id'], name='careers_unique_job'),
        ]
        indexes = [models.Index(fields=['is_active', '-posted_at'], name='careers_active_posted')]

    def __str__(self):
        """Admin label: title and company."""
        return f'{self.title} - {self.source.company_name}'

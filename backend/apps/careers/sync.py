"""Fetch one `CareerSource` and bring its `CareerJob` rows up to date.

Called by the `fetch_all_career_sources` Celery task, the
`fetch_career_jobs` management command and the admin "Fetch now" action.

A successful fetch upserts every returned job and deactivates the source's
jobs that are no longer listed (stale listings hurt trust most). A failed
fetch changes no jobs, so a broken or unreachable feed never wipes a
company's listings; it only records the error on the source.
"""
from dataclasses import dataclass

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from .adapters import ADAPTERS, AdapterError
from .ats import PoliteFetcher
from .cities import encode_cities, extract_cities
from .models import CareerJob, CareerSource


@dataclass
class SyncResult:
    """Counts from one `sync_source` run (for logs and command output)."""
    created: int = 0  # New jobs saved
    updated: int = 0  # Existing jobs refreshed (including reactivated ones)
    deactivated: int = 0  # Jobs hidden because the feed no longer lists them
    error: str = ''  # Error text when the fetch failed ('' on success)


def sync_source(source, fetcher=None):
    """Fetch `source`'s feed and save the results; returns a `SyncResult`.

    `fetcher` lets one `PoliteFetcher` (and its robots.txt cache / host
    timers) be shared across many sources in a run. Jobs keep their
    `first_seen_at`; Workday's approximate `posted_at` is only set on first
    sight so it doesn't drift by a day on every fetch.
    """
    fetcher = fetcher or PoliteFetcher()
    adapter = ADAPTERS.get(source.ats)
    now = timezone.now()
    try:
        if adapter is None:
            raise AdapterError(f'No adapter for ATS {source.ats!r}')
        jobs = adapter(fetcher, source.ats_slug, settings.CAREER_JOBS_MAX_PER_SOURCE)
    except Exception as exc:  # network errors, unexpected JSON shapes, AdapterError
        source.last_status = CareerSource.Status.FAILED
        source.last_error = f'{type(exc).__name__}: {exc}'[:2000]
        source.consecutive_failures += 1
        source.save(update_fields=['last_status', 'last_error', 'consecutive_failures', 'updated_at'])
        return SyncResult(error=source.last_error)

    result = SyncResult()
    with transaction.atomic():
        existing = {j.external_id: j for j in source.jobs.all()}
        seen = set()
        for data in jobs:
            if not data.external_id or not data.title or not data.apply_url or data.external_id in seen:
                continue  # incomplete rows and duplicates within one feed
            seen.add(data.external_id)
            fields = dict(title=data.title[:300], location=data.location[:300], department=data.department[:200],
                          cities=encode_cities(extract_cities(data.location))[:500],
                          employment_type=data.employment_type[:100], apply_url=data.apply_url[:1000],
                          last_seen_at=now, is_active=True)
            job = existing.get(data.external_id)
            if job is None:
                CareerJob.objects.create(source=source, external_id=data.external_id, posted_at=data.posted_at, **fields)
                result.created += 1
            else:
                if not data.posted_is_approx or job.posted_at is None:
                    fields['posted_at'] = data.posted_at
                for name, value in fields.items():
                    setattr(job, name, value)
                job.save()
                result.updated += 1
        result.deactivated = (source.jobs.filter(is_active=True).exclude(external_id__in=seen)
                              .update(is_active=False))
        source.last_status = CareerSource.Status.OK
        source.last_error = ''
        source.consecutive_failures = 0
        source.last_fetched_at = now
        source.save(update_fields=['last_status', 'last_error', 'consecutive_failures', 'last_fetched_at', 'updated_at'])
    return result

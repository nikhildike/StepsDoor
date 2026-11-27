"""Open tenders, tender-alert matching and dashboard counts.

The tender counterpart of `apps.jobseekers.listings`. Used by:
- `apps.tenders.views` — tenders matching an alert, keyword suggestions, the
  contractor dashboard stats, and saved-tender display;
- `apps.tenders.tasks.match_tender_alerts` — the daily digest uses the same
  matching (`alert_match_queryset`), so the email and the on-site list agree.
"""
from datetime import timedelta

from django.db.models import Q
from django.utils import timezone

from apps.jobseekers.listings import start_of_today_ist


def open_tenders():
    """Tenders a contractor can still bid on: active, and the submission deadline not passed (or unknown)."""
    from .models import Tender
    return (Tender.objects.filter(is_active=True)
            .filter(Q(submission_deadline__isnull=True) | Q(submission_deadline__gt=timezone.now())))


def alert_match_queryset(alert):
    """Open tenders matching a `TenderAlert`, soonest closing first.

    - `keyword`: every word must appear in the title or the issuing organisation
      ("road repair" matches "Repair of roads, Ward 8").
    - `state`: exact state name (case-insensitive); `category`: exact category;
      `min_value`: estimated value at least this (tenders without one are left out).
    An alert with no filters matches every open tender.
    """
    qs = open_tenders()
    for word in (alert.keyword or '').split():
        qs = qs.filter(Q(title__icontains=word) | Q(organisation__icontains=word))
    if alert.state:
        qs = qs.filter(state__iexact=alert.state)
    if alert.category:
        qs = qs.filter(category=alert.category)
    if alert.min_value:
        qs = qs.filter(estimated_value__gte=alert.min_value)
    return qs.order_by('submission_deadline', '-created_at')


def collect_matches(alerts, limit):
    """Open tenders matching any of `alerts`, each once, soonest closing first.

    Returns {count, results} — `results` is at most `limit` Tender objects. Used by
    the per-alert and all-alerts match endpoints (one alert or several).
    """
    ids, candidates = set(), {}
    for alert in alerts:
        qs = alert_match_queryset(alert)
        ids.update(qs.values_list('id', flat=True))
        if limit > 0:
            for tender in qs[:limit]:
                candidates.setdefault(tender.id, tender)
    far = timezone.now() + timedelta(days=36500)  # no deadline sorts last
    ordered = sorted(candidates.values(), key=lambda t: (t.submission_deadline or far, -t.created_at.timestamp()))
    return {'count': len(ids), 'results': ordered[:limit]}


def keyword_suggestions(query, limit=8):
    """Tender keywords starting with `query`, from open tenders' titles (see `core.suggestions`).

    "road" -> "Road", "Road Construction", "Road Repair"…; returns [{keyword, count}].
    """
    from core.suggestions import phrase_suggestions
    return phrase_suggestions(query, [open_tenders()], limit)


def new_today_count(now=None):
    """Open tenders first scraped since midnight India time."""
    return open_tenders().filter(created_at__gte=start_of_today_ist(now)).count()

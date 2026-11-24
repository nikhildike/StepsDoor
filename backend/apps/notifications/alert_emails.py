"""
Alert digest emails — the shared engine behind every "new listings match your alert" email.

Used by the daily matching tasks for all three alert kinds:
  - apps.tenders.tasks.match_tender_alerts   (TenderAlert  → Tender)
  - apps.govtjobs.tasks.match_govtjob_alerts (GovtJobAlert → GovtJob)
  - apps.alerts.tasks.match_job_alerts        (JobAlert     → JobPost)

How a run works (see `send_alert_digests`):
  1. Each active alert is matched against listings created after its
     `last_checked_at` (or after the alert itself was created, so a new alert
     never floods its owner with old listings).
  2. Matches are grouped per user — one email per user per alert kind, each
     listing once even if several of the user's alerts matched it.
  3. After a user's email is sent (or they simply had no matches), their alerts'
     `last_checked_at` moves to the run's start time. If sending fails, it
     doesn't, so the next run retries those listings — and other users are
     unaffected. This also makes missed or doubled runs harmless.

Email goes through Django's configured EMAIL_BACKEND (SendGrid in production,
console in development); templates are templates/emails/alert_digest.{txt,html}.
"""
import logging
from dataclasses import dataclass, field

from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils import timezone

logger = logging.getLogger(__name__)


def inr(amount):
    """
    Format a rupee amount with Indian digit grouping for digest lines.

    1228141 → "₹12,28,141" (lakh/crore grouping: last three digits, then pairs) —
    what Indian readers expect, unlike Python's "1,228,141". Decimals are dropped.
    """
    digits = str(int(amount))
    head, tail = digits[:-3], digits[-3:]
    groups = []
    while len(head) > 2:
        groups.insert(0, head[-2:])
        head = head[:-2]
    if head:
        groups.insert(0, head)
    return '₹' + ','.join(groups + [tail])


@dataclass
class DigestItem:
    """One listing line in a digest email."""
    title: str
    url: str           # absolute link to the listing on the web app
    details: str = ''  # one short line, e.g. "MC Karnal · Haryana · closes 1 Dec 2026"


@dataclass
class AlertKind:
    """
    Describes one alert type to `send_alert_digests`.

    - noun: plural shown in the email body, e.g. "government tenders"
    - label: singular alert name for the subject, e.g. "tender" → "…for your tender alerts"
    - user_of: alert → User who receives the email
    - match: (alert, since) → queryset of listings created after `since` matching the alert
    - to_item: listing → DigestItem
    """
    noun: str
    label: str
    user_of: callable
    match: callable
    to_item: callable


@dataclass
class _UserDigest:
    """Per-user accumulator: the user's alerts this run and their matched listings (deduplicated)."""
    alerts: list = field(default_factory=list)
    listings: dict = field(default_factory=dict)  # listing pk → listing, insertion-ordered


def send_alert_digests(alerts, kind: AlertKind):
    """
    Match `alerts` (active alert objects with `last_checked_at`/`created_at`) and email
    each owner one digest. Returns a dict of counts: users_emailed, listings_sent, failed.
    """
    run_started = timezone.now()
    digests = {}
    for alert in alerts:
        user = kind.user_of(alert)
        digest = digests.setdefault(user.pk, (user, _UserDigest()))[1]
        digest.alerts.append(alert)
        since = alert.last_checked_at or alert.created_at
        for listing in kind.match(alert, since):
            digest.listings.setdefault(listing.pk, listing)

    counts = {'users_emailed': 0, 'listings_sent': 0, 'failed': 0}
    for user, digest in digests.values():
        if digest.listings:
            if not (user.is_active and user.email):
                logger.info(f'Alert digest skipped for user {user.pk}: no email address or inactive account.')
            else:
                try:
                    _send_digest(user, kind, [kind.to_item(l) for l in digest.listings.values()])
                except Exception:
                    # Leave last_checked_at alone so the next run retries these listings.
                    logger.exception(f'Alert digest to user {user.pk} failed; will retry next run.')
                    counts['failed'] += 1
                    continue
                counts['users_emailed'] += 1
                counts['listings_sent'] += len(digest.listings)
        type(digest.alerts[0]).objects.filter(pk__in=[a.pk for a in digest.alerts]).update(last_checked_at=run_started)
    return counts


def _send_digest(user, kind, items):
    """Render and send one digest (plain text + HTML) to `user`."""
    limit = settings.ALERT_EMAIL_MAX_ITEMS
    context = {
        'name': user.first_name or user.username,
        'noun': kind.noun,
        'label': kind.label,
        'count': len(items),
        'items': items[:limit],
        'more': max(len(items) - limit, 0),
        'manage_url': f'{settings.FRONTEND_URL}/seeker/alerts',
        'site_url': settings.FRONTEND_URL,
    }
    n = len(items)
    subject = f"StepsDoor: {n} new match{'es' if n != 1 else ''} for your {kind.label} alerts"
    message = EmailMultiAlternatives(
        subject=subject,
        body=render_to_string('emails/alert_digest.txt', context),
        to=[user.email],
    )
    message.attach_alternative(render_to_string('emails/alert_digest.html', context), 'text/html')
    message.send()

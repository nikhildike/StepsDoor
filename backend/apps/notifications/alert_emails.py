"""
Alert digests — the shared engine behind every "new listings match your alert" email and push.

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
    - push_kind: "tender" | "govt_job" | "job" — tells the mobile app which screen a
      tapped push should open (see mobile/src/services/notificationRouting.ts)
    """
    noun: str
    label: str
    user_of: callable
    match: callable
    to_item: callable
    push_kind: str = ''


@dataclass
class _UserDigest:
    """Per-user accumulator: the user's alerts this run and their matched listings (deduplicated)."""
    alerts: list = field(default_factory=list)
    listings: dict = field(default_factory=dict)  # listing pk → listing, insertion-ordered


def send_alert_digests(alerts, kind: AlertKind):
    """
    Match `alerts` (active alert objects with `last_checked_at`/`created_at`) and send
    each owner one digest: an email if they have an address, plus a push notification to
    each device they've registered (apps.notifications.push). Returns a dict of counts:
    users_emailed, users_pushed, listings_sent (to users reached either way), failed.

    Email is the retried channel: if it fails, the user's alerts aren't advanced and no
    push is sent, so the next run delivers both once. Push is best-effort and never
    blocks a run.
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

    counts = {'users_emailed': 0, 'users_pushed': 0, 'listings_sent': 0, 'failed': 0}
    for user, digest in digests.values():
        listings = list(digest.listings.values())
        if listings and not user.is_active:
            logger.info(f'Alert digest skipped for user {user.pk}: inactive account.')
        elif listings:
            if user.email:
                try:
                    _send_digest(user, kind, [kind.to_item(l) for l in listings])
                except Exception:
                    # Leave last_checked_at alone (and skip push) so the next run retries both once.
                    logger.exception(f'Alert digest to user {user.pk} failed; will retry next run.')
                    counts['failed'] += 1
                    continue
                counts['users_emailed'] += 1
            pushed = _push_digest(user, kind, listings)
            counts['users_pushed'] += 1 if pushed else 0
            if user.email or pushed:
                counts['listings_sent'] += len(listings)
            else:
                logger.info(f'Alert digest skipped for user {user.pk}: no email address and no registered device.')
        type(digest.alerts[0]).objects.filter(pk__in=[a.pk for a in digest.alerts]).update(last_checked_at=run_started)
    return counts


def _push_digest(user, kind, listings):
    """
    Push a one-line summary of the digest to the user's devices; returns messages accepted.

    Payload `data` = {type: "alert_digest", kind, count, id}: `id` is the listing's pk when
    there's exactly one match, so a tap opens it directly; otherwise the app opens the list.
    """
    from apps.notifications.push import send_push  # local import: push imports models
    n = len(listings)
    first = listings[0]
    body = first.title[:120] + (f' and {n - 1} more' if n > 1 else '')
    try:
        return send_push(
            user,
            title=f"{n} new {kind.label} match{'es' if n != 1 else ''}",
            body=body,
            data={'type': 'alert_digest', 'kind': kind.push_kind, 'count': n, 'id': first.pk if n == 1 else None},
        )
    except Exception:
        logger.exception(f'Alert push to user {user.pk} failed (email, if any, already sent).')
        return 0


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

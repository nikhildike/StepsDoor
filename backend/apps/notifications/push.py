"""
Push notifications through Expo's push service.

The mobile app (Expo SDK 57) registers an Expo push token per signed-in device
(PushTokenView → FCMToken). This module turns "notify these users" into
POST https://exp.host/--/api/v2/push/send requests, and Expo forwards each message
to FCM (Android) or APNs (iOS). Called by apps.notifications.alert_emails after a
user's alert digest is assembled.

Expo's rules this follows (docs.expo.dev/push-notifications/sending-notifications):
  - at most 100 messages per request, so tokens are sent in batches;
  - the response holds one ticket per message, in order; a ticket with
    details.error == "DeviceNotRegistered" means the app was uninstalled or the
    token expired, so that token is deleted;
  - Android shows messages only on an existing channel — the app creates "default".
Delivery receipts (getReceipts) aren't checked; tickets catch the common
DeviceNotRegistered case, and push is best-effort next to the email digest.
"""
import logging

import requests
from django.conf import settings

from apps.notifications.models import FCMToken

logger = logging.getLogger(__name__)

EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'
BATCH_SIZE = 100       # Expo's per-request message limit
REQUEST_TIMEOUT = 15   # seconds; a slow Expo shouldn't stall the whole alert run


def send_push(user, title, body, data=None):
    """
    Send one notification to every device `user` has registered.

    `data` is delivered to the app untouched (the app's tap handler uses it to open the
    right screen; keep it small — Expo caps the whole payload at ~4 KiB). Returns the
    number of messages Expo accepted. Never raises for delivery problems: network or
    Expo errors are logged, since push is a best-effort companion to the email.
    """
    if not settings.PUSH_NOTIFICATIONS_ENABLED:
        return 0
    tokens = list(FCMToken.objects.filter(user=user).values_list('token', flat=True))
    if not tokens:
        return 0

    message = {
        'title': title,
        'body': body,
        'data': data or {},
        'sound': 'default',
        'channelId': 'default',  # created by the app (notificationService.ensureAndroidChannel)
        'priority': 'high',
    }
    accepted = 0
    for start in range(0, len(tokens), BATCH_SIZE):
        batch = tokens[start:start + BATCH_SIZE]
        accepted += _post_batch([{**message, 'to': token} for token in batch], batch)
    return accepted


def _post_batch(messages, tokens):
    """POST one batch to Expo; delete tokens Expo reports as unregistered. Returns tickets with status ok."""
    headers = {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
    }
    if settings.EXPO_PUSH_ACCESS_TOKEN:
        headers['Authorization'] = f'Bearer {settings.EXPO_PUSH_ACCESS_TOKEN}'
    try:
        response = requests.post(EXPO_PUSH_URL, json=messages, headers=headers, timeout=REQUEST_TIMEOUT)
        response.raise_for_status()
        tickets = response.json().get('data', [])
    except (requests.RequestException, ValueError) as exc:
        logger.error(f'Expo push request failed for {len(messages)} message(s): {exc!r}')
        return 0

    accepted, dead = 0, []
    for token, ticket in zip(tokens, tickets):
        if ticket.get('status') == 'ok':
            accepted += 1
            continue
        error = (ticket.get('details') or {}).get('error')
        if error == 'DeviceNotRegistered':
            dead.append(token)
        else:
            logger.warning(f'Expo push ticket error for a device: {error or ticket.get("message")}')
    if dead:
        FCMToken.objects.filter(token__in=dead).delete()
        logger.info(f'Removed {len(dead)} push token(s) Expo reported as DeviceNotRegistered.')
    return accepted

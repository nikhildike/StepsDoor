# Django app configuration for `apps.subscriptions` — registers the app and its label.
from django.apps import AppConfig


class SubscriptionsConfig(AppConfig):
    """AppConfig for the `subscriptions` app; wires up the app under Django's app registry."""
    default_auto_field = 'django.db.models.BigAutoField'  # PK type for models in this app that don't set one explicitly
    name = 'apps.subscriptions'  # dotted path Django uses to locate/import this app
    label = 'subscriptions'  # short app label used in DB table prefixes (subscriptions_plan, etc.) and migrations

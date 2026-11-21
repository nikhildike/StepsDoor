# Django app configuration for `apps.services` — registers the app and its display name.
from django.apps import AppConfig


class ServicesConfig(AppConfig):
    """AppConfig for the `services` app; wires up the app under Django's app registry."""
    default_auto_field = 'django.db.models.BigAutoField'  # PK type for models in this app that don't set one explicitly
    name = 'apps.services'  # dotted path Django uses to locate/import this app
    verbose_name = 'Local Services'  # human-readable label shown in the Django admin index

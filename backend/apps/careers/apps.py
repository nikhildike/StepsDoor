# Django app configuration for the `careers` app (private-company careers pages).
from django.apps import AppConfig


class CareersConfig(AppConfig):
    """App config registering the `careers` app with Django.

    Loaded via the `INSTALLED_APPS` entry `apps.careers.apps.CareersConfig`
    so its management commands (and, later, models) are discoverable.
    """
    default_auto_field = 'django.db.models.BigAutoField'  # BigAutoField for any future models in this app
    name = 'apps.careers'  # Dotted Python path Django uses to locate this app
    label = 'careers'  # App label used in migrations / ContentType registry

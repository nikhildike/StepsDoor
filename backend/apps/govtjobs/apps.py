# Django app configuration for the `govtjobs` app.
from django.apps import AppConfig


class GovtJobsConfig(AppConfig):
    """App config registering the `govtjobs` app with Django.

    Django's app registry loads this class at startup (via the
    `INSTALLED_APPS` entry `apps.govtjobs.apps.GovtJobsConfig`) so the app's
    models, admin, resources, and Celery tasks are discoverable.
    """
    default_auto_field = 'django.db.models.BigAutoField'  # Use BigAutoField for auto-generated PKs on models in this app
    name = 'apps.govtjobs'  # Dotted Python path Django uses to locate this app
    label = 'govtjobs'  # Explicit app label (distinct from the last component of `name`), used e.g. in migrations and the ContentType registry

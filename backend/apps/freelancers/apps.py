# Django app configuration for the `freelancers` app.
from django.apps import AppConfig


class FreelancersConfig(AppConfig):
    """App config registering the `freelancers` app with Django.

    Django's app registry loads this class (via `default_app_config` discovery
    or the `INSTALLED_APPS` entry `apps.freelancers.apps.FreelancersConfig`) at
    startup so the app's models, admin, and signals are picked up.
    """
    default_auto_field = 'django.db.models.BigAutoField'  # Use BigAutoField for auto-generated PKs on models in this app
    name = 'apps.freelancers'  # Dotted Python path Django uses to locate this app
    verbose_name = 'Freelancers'  # Human-readable name shown in the Django admin index

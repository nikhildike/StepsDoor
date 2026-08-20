# Django app configuration for the `jobs` app (private, company-paid job listings).
from django.apps import AppConfig


class JobsConfig(AppConfig):
    """App config for the `jobs` app.

    Registers the `apps.jobs` app with Django under the short label
    `jobs`, which is what shows up in migrations, the admin URL
    namespace, and `apps.get_app_config('jobs')` lookups elsewhere
    in the project (e.g. alerts matching against new job posts).
    """
    default_auto_field = 'django.db.models.BigAutoField'  # Use 64-bit auto PKs for models in this app
    name = 'apps.jobs'  # Dotted Python path to the app package
    label = 'jobs'  # Short app label used in migrations, admin, and app registry lookups

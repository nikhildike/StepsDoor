# Django app configuration for the `jobseekers` app (job-seeker profiles and saved jobs).
from django.apps import AppConfig


class JobseekersConfig(AppConfig):
    """App config for the `jobseekers` app.

    Registers the `apps.jobseekers` app with Django under the short
    label `jobseekers`, used in migrations, the admin URL namespace,
    and app registry lookups (e.g. alerts/notifications resolving a
    job seeker's profile from their user account).
    """
    default_auto_field = 'django.db.models.BigAutoField'  # Use 64-bit auto PKs for models in this app
    name = 'apps.jobseekers'  # Dotted Python path to the app package
    label = 'jobseekers'  # Short app label used in migrations, admin, and app registry lookups

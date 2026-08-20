"""Django app configuration for the `analytics` app (job post and store
click-event tracking, which powers the company analytics dashboard)."""

from django.apps import AppConfig


class AnalyticsConfig(AppConfig):
    """App config registered in INSTALLED_APPS for `apps.analytics`.

    Django instantiates this automatically at startup (via the app registry)
    to configure the app; it has no custom ready()/signal wiring beyond the
    defaults.
    """
    default_auto_field = 'django.db.models.BigAutoField'  # default PK type for models in this app
    name = 'apps.analytics'  # dotted Python path to the app package
    label = 'analytics'  # short app label used in migrations, DB table prefixes, and admin URLs

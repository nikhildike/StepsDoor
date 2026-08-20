"""Django app configuration for the `alerts` app (private job alert
subscriptions and the matching that powers email/push notifications when
new jobs matching a job seeker's saved criteria are posted)."""

from django.apps import AppConfig


class AlertsConfig(AppConfig):
    """App config registered in INSTALLED_APPS for `apps.alerts`.

    Django instantiates this automatically at startup (via the app registry)
    to configure the app; it has no custom ready()/signal wiring beyond the
    defaults.
    """
    default_auto_field = 'django.db.models.BigAutoField'  # default PK type for models in this app
    name = 'apps.alerts'  # dotted Python path to the app package
    label = 'alerts'  # short app label used in migrations, DB table prefixes, and admin URLs

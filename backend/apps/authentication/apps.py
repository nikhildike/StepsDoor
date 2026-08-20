# Django app configuration for the `authentication` app — registers the app with Django's
# app registry so its models (User, EmailOTP), admin, and settings (AUTH_USER_MODEL) are discovered.
from django.apps import AppConfig


class AuthenticationConfig(AppConfig):
    """App config for `apps.authentication`.

    Referenced by `AUTH_USER_MODEL = 'authentication.User'` and by
    `INSTALLED_APPS` in the Django settings modules; Django instantiates this
    automatically at startup to configure the app (default PK type, app label
    used for migrations and the `content_type`/`permission` framework).
    """
    default_auto_field = 'django.db.models.BigAutoField'  # New models in this app get BigAutoField (64-bit) PKs by default
    name = 'apps.authentication'  # Dotted Python path to the app package, used by Django's app registry
    label = 'authentication'  # Short app label used in AUTH_USER_MODEL, migrations, and reverse('authentication:...')

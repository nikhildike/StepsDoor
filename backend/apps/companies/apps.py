# Django app configuration for the `companies` app — registers the app with Django's
# app registry so its models (Company), admin, and views are discovered and wired up.
from django.apps import AppConfig


class CompaniesConfig(AppConfig):
    """App config for `apps.companies`.

    Referenced by `INSTALLED_APPS` in the Django settings modules; Django
    instantiates this automatically at startup to configure the app (default
    PK type, app label used for migrations and the `content_type` framework).
    """
    default_auto_field = 'django.db.models.BigAutoField'  # New models in this app get BigAutoField (64-bit) PKs by default
    name = 'apps.companies'  # Dotted Python path to the app package, used by Django's app registry
    label = 'companies'  # Short app label used in migrations and reverse('companies:...')

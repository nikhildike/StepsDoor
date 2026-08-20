# Django app configuration for the `payments` app (Razorpay subscription
# webhooks, WebhookLog auditing, and Invoice/PDF billing records).
from django.apps import AppConfig


class PaymentsConfig(AppConfig):
    """App config that registers the `payments` app with Django.

    Referenced from `INSTALLED_APPS` in the project settings so Django
    discovers this app's models (Invoice, WebhookLog), admin registrations,
    and URLs.
    """
    default_auto_field = 'django.db.models.BigAutoField'  # Use 64-bit auto PKs for models in this app.
    name = 'apps.payments'  # Python import path of the app package.
    label = 'payments'  # Short app label used in migrations, `apps.get_model()`, etc.

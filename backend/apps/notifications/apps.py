# Django app configuration for the `notifications` app (FCM push token
# registration and, more broadly, the home for notification-dispatch
# concerns such as SendGrid email sending).
from django.apps import AppConfig


class NotificationsConfig(AppConfig):
    """App config that registers the `notifications` app with Django.

    Referenced from `INSTALLED_APPS` in the project settings so Django
    discovers this app's models (FCMToken), admin registrations, and URLs.
    """
    default_auto_field = 'django.db.models.BigAutoField'  # Use 64-bit auto PKs for models in this app.
    name = 'apps.notifications'  # Python import path of the app package.
    label = 'notifications'  # Short app label used in migrations, `apps.get_model()`, etc.

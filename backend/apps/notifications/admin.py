"""Django admin registrations for the notifications app.

Exposes `FCMToken` (device tokens used for Firebase Cloud Messaging push
notifications) in the Django admin so staff can inspect/debug which users
have registered which devices.
"""

from django.contrib import admin

from .models import FCMToken


@admin.register(FCMToken)
class FCMTokenAdmin(admin.ModelAdmin):
    """Admin interface for FCM device tokens.

    Used by staff to look up which push-notification tokens are registered
    for a given user, e.g. while debugging why a push notification did not
    arrive on a job seeker's device.
    """
    # Show the owning user and registration time in the change list.
    list_display = ['user', 'created_at']
    # Allow staff to look up a token by the owning user's username or email.
    search_fields = ['user__username', 'user__email']
    # created_at is auto-populated on insert (auto_now_add) so it must stay read-only.
    readonly_fields = ['created_at']

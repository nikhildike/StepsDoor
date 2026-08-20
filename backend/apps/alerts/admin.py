"""Django admin registration for the `alerts` app, exposing JobAlert records
at /admin/alerts/jobalert/ so staff can inspect, search, and moderate saved
job-alert subscriptions created by job seekers."""

from django.contrib import admin

from .models import JobAlert


@admin.register(JobAlert)
class JobAlertAdmin(admin.ModelAdmin):
    """Admin configuration for JobAlert: lets staff browse and manage the
    alert criteria job seekers have saved, e.g. to debug why a seeker isn't
    receiving expected notifications or to deactivate a stale alert."""
    # Columns shown in the admin change list, ordered for quick scanning of who the alert belongs
    # to, its match criteria, and whether it's currently eligible for matching.
    list_display = ['job_seeker', 'city', 'role_keyword', 'job_type', 'is_active', 'created_at']
    # Sidebar filters: narrow down to active/inactive alerts or by job type.
    list_filter = ['is_active', 'job_type']
    # Admin search box fields: reaches through the job_seeker->user relation to search by
    # username, plus the free-text city/role_keyword criteria fields.
    search_fields = ['job_seeker__user__username', 'city', 'role_keyword']

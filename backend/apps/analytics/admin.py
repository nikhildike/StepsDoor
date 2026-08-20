"""Django admin registration for the `analytics` app, exposing JobClick
records at /admin/analytics/jobclick/ so staff can inspect raw click
events behind the company analytics dashboard. StoreClick is not
currently registered here."""

from django.contrib import admin

from .models import JobClick


@admin.register(JobClick)
class JobClickAdmin(admin.ModelAdmin):
    """Admin configuration for JobClick: lets staff audit individual
    click-through events on job posts, e.g. to investigate suspicious
    click volume or verify analytics numbers shown to a company."""
    # Columns in the admin change list: which job was clicked, the visitor's IP, and when.
    list_display = ['job_post', 'ip_address', 'clicked_at']
    # Sidebar filter by date (Django's built-in date drill-down) to inspect click volume over time.
    list_filter = ['clicked_at']
    # Admin search box fields: reaches through job_post to search by job title, plus the IP address.
    search_fields = ['job_post__title', 'ip_address']
    # clicked_at is set automatically (auto_now_add) and must not be edited from the admin.
    readonly_fields = ['clicked_at']

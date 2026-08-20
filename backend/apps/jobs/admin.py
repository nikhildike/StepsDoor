"""Django admin registration for the `jobs` app.

Exposes `JobPost` in the Django admin so staff can review, moderate,
or manually edit/deactivate job listings posted by paying companies.
"""
from django.contrib import admin

from .models import JobPost


@admin.register(JobPost)
class JobPostAdmin(admin.ModelAdmin):
    """Admin interface for `JobPost`.

    Used by internal staff to browse and manage job listings (e.g.
    deactivating a listing that violates policy, or checking click
    counts) without needing direct DB access.
    """
    # Columns shown in the admin change list; surfaces the fields staff
    # care about most: what/where the job is, its status, and engagement (clicks).
    list_display = ['title', 'company', 'city', 'job_type', 'is_active', 'clicks', 'created_at']
    # Sidebar filters for quickly narrowing the list by job type, active status, or city
    list_filter = ['job_type', 'is_active', 'city']
    # Fields searched by the admin search box
    search_fields = ['title', 'description', 'location', 'city']
    # Fields that are system-managed (click tracking, creation timestamp) and must not be hand-edited in admin
    readonly_fields = ['clicks', 'created_at']

"""
Django admin registration for the `govtjobs` app.

Lets staff browse/manage scraped govt job listings and job seekers' saved
alerts from the Django admin site, and bulk import/export `GovtJob` rows via
django-import-export (`GovtJobResource`).
"""
from django.contrib import admin
from import_export.admin import ImportExportModelAdmin
from .models import GovtJob, GovtJobAlert
from .resources import GovtJobResource


@admin.register(GovtJob)
class GovtJobAdmin(ImportExportModelAdmin):
    """Admin interface for scraped government job listings.

    Extends `ImportExportModelAdmin` (rather than plain `ModelAdmin`) so
    staff can bulk import/export listings as CSV/Excel using
    `GovtJobResource`, in addition to normal browsing/editing — e.g. to
    manually correct a bad scrape or seed jobs outside the scraper pipeline.
    """
    resource_classes = [GovtJobResource]
    # Columns shown in the list view for quick scanning/triage of scraped listings
    list_display = ['title', 'organisation', 'state', 'category', 'vacancy_count', 'application_deadline', 'is_active', 'source_portal']
    # Sidebar filters matching the fields staff most commonly narrow by, including which portal a listing came from
    list_filter = ['state', 'category', 'is_active', 'source_portal']
    search_fields = ['title', 'organisation', 'job_id']
    readonly_fields = ['search_vector', 'created_at', 'updated_at']  # search_vector is computed automatically in GovtJob.save(), not hand-edited
    date_hierarchy = 'published_at'  # Adds a date-based drill-down navigation by publish date
    list_per_page = 50


@admin.register(GovtJobAlert)
class GovtJobAlertAdmin(admin.ModelAdmin):
    """Admin interface for job seekers' saved govt job alerts.

    Lets staff inspect/troubleshoot which alerts exist and their filter
    criteria, e.g. when debugging why a user did or didn't get notified.
    """
    list_display = ['user', 'keyword', 'state', 'category', 'is_active', 'created_at']
    list_filter = ['is_active', 'state', 'category']
    search_fields = ['user__email', 'keyword']

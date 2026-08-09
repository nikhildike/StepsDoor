from django.contrib import admin
from import_export.admin import ImportExportModelAdmin
from .models import GovtJob, GovtJobAlert
from .resources import GovtJobResource


@admin.register(GovtJob)
class GovtJobAdmin(ImportExportModelAdmin):
    resource_classes = [GovtJobResource]
    list_display = ['title', 'organisation', 'state', 'category', 'vacancy_count', 'application_deadline', 'is_active', 'source_portal']
    list_filter = ['state', 'category', 'is_active', 'source_portal']
    search_fields = ['title', 'organisation', 'job_id']
    readonly_fields = ['search_vector', 'created_at', 'updated_at']
    date_hierarchy = 'published_at'
    list_per_page = 50


@admin.register(GovtJobAlert)
class GovtJobAlertAdmin(admin.ModelAdmin):
    list_display = ['user', 'keyword', 'state', 'category', 'is_active', 'created_at']
    list_filter = ['is_active', 'state', 'category']
    search_fields = ['user__email', 'keyword']

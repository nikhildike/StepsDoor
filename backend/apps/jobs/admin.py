from django.contrib import admin

from .models import JobPost


@admin.register(JobPost)
class JobPostAdmin(admin.ModelAdmin):
    list_display = ['title', 'company', 'city', 'job_type', 'is_active', 'clicks', 'created_at']
    list_filter = ['job_type', 'is_active', 'city']
    search_fields = ['title', 'description', 'location', 'city']
    readonly_fields = ['clicks', 'created_at']

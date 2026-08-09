from django.contrib import admin

from .models import JobAlert


@admin.register(JobAlert)
class JobAlertAdmin(admin.ModelAdmin):
    list_display = ['job_seeker', 'city', 'role_keyword', 'job_type', 'is_active', 'created_at']
    list_filter = ['is_active', 'job_type']
    search_fields = ['job_seeker__user__username', 'city', 'role_keyword']

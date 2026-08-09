from django.contrib import admin

from .models import JobSeeker, SavedJob


@admin.register(JobSeeker)
class JobSeekerAdmin(admin.ModelAdmin):
    list_display = ['user', 'phone', 'created_at']
    search_fields = ['user__username', 'user__email', 'phone']


@admin.register(SavedJob)
class SavedJobAdmin(admin.ModelAdmin):
    list_display = ['job_seeker', 'job_post', 'saved_at']
    list_filter = ['saved_at']

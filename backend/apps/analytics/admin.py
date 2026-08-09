from django.contrib import admin

from .models import JobClick


@admin.register(JobClick)
class JobClickAdmin(admin.ModelAdmin):
    list_display = ['job_post', 'ip_address', 'clicked_at']
    list_filter = ['clicked_at']
    search_fields = ['job_post__title', 'ip_address']
    readonly_fields = ['clicked_at']

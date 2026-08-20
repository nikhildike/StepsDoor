"""Django admin registration for the `jobseekers` app.

Exposes `JobSeeker` and `SavedJob` in the Django admin so staff can
look up a job seeker's profile or inspect which jobs they've bookmarked
(e.g. for support requests or debugging).
"""
from django.contrib import admin

from .models import JobSeeker, SavedJob


@admin.register(JobSeeker)
class JobSeekerAdmin(admin.ModelAdmin):
    """Admin interface for `JobSeeker` profiles."""
    # Columns shown in the admin change list
    list_display = ['user', 'phone', 'created_at']
    # Lets staff search by the underlying user's username/email or by phone number
    search_fields = ['user__username', 'user__email', 'phone']


@admin.register(SavedJob)
class SavedJobAdmin(admin.ModelAdmin):
    """Admin interface for `SavedJob` bookmarks."""
    # Columns shown in the admin change list; shows who saved what and when
    list_display = ['job_seeker', 'job_post', 'saved_at']
    # Sidebar filter to narrow saved jobs by save date
    list_filter = ['saved_at']

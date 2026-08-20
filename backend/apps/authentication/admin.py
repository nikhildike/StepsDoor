"""Django admin registration for the `authentication` app's `User` model."""
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Admin configuration for `User`, extending Django's built-in `UserAdmin`.

    Lets staff browse/manage all accounts (job seekers, companies, store
    owners) at `/admin/authentication/user/`, and adds StepsDoor's custom
    role fields (`phone`, `is_company`, `is_job_seeker`) to the standard
    auth fieldsets so they're editable from the change/add forms.
    """
    # Columns shown in the admin change-list — surfaces the role flags and signup date
    # alongside the default username/email so staff can spot account type at a glance.
    list_display = ['username', 'email', 'is_company', 'is_job_seeker', 'is_staff', 'created_at']
    # Sidebar filters — lets staff quickly narrow the list to a role or active/staff status.
    list_filter = ['is_company', 'is_job_seeker', 'is_staff', 'is_active']
    fieldsets = BaseUserAdmin.fieldsets + (
        ('StepsDoor', {'fields': ('phone', 'is_company', 'is_job_seeker')}),
    )
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ('StepsDoor', {'fields': ('phone', 'is_company', 'is_job_seeker')}),
    )

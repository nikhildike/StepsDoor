from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['username', 'email', 'is_company', 'is_job_seeker', 'is_staff', 'created_at']
    list_filter = ['is_company', 'is_job_seeker', 'is_staff', 'is_active']
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Linksdoor', {'fields': ('phone', 'is_company', 'is_job_seeker')}),
    )
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ('Linksdoor', {'fields': ('phone', 'is_company', 'is_job_seeker')}),
    )

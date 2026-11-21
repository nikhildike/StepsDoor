# Django admin registration for the `services` app.
from django.contrib import admin

from .models import ServiceProvider


@admin.register(ServiceProvider)
class ServiceProviderAdmin(admin.ModelAdmin):
    """Admin config for ServiceProvider — the only way to create/manage listings, since there's no owner self-service flow yet."""
    # Columns shown in the admin change list; surfaces the key identifying/moderation fields at a glance.
    list_display = ['name', 'category', 'city', 'phone', 'is_active', 'created_at']
    # Sidebar filters — category/city to browse by vertical or location, is_active to find hidden listings.
    list_filter = ['category', 'city', 'is_active']
    # Fields searched by the admin search box.
    search_fields = ['name', 'description', 'address', 'city']
    # Timestamps are auto-managed — not directly editable.
    readonly_fields = ['created_at', 'updated_at']
    fieldsets = [
        (None, {
            'fields': ['name', 'category', 'description', 'photo', 'is_active'],
        }),
        ('Location', {
            'fields': ['address', 'city', 'state', 'pincode'],
        }),
        ('Contact', {
            'fields': ['phone', 'whatsapp', 'email'],
        }),
        ('Timestamps', {
            'fields': ['created_at', 'updated_at'],
            'classes': ['collapse'],
        }),
    ]

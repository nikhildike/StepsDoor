from django.contrib import admin
from .models import Store


@admin.register(Store)
class StoreAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'website_url', 'contact_email', 'is_active', 'created_at']
    list_filter = ['category', 'is_active']
    search_fields = ['name', 'contact_email', 'website_url']
    readonly_fields = ['slug', 'created_at', 'updated_at']

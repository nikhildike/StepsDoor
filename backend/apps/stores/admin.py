# Django admin registration for the `stores` app.
from django.contrib import admin
from .models import Store


@admin.register(Store)
class StoreAdmin(admin.ModelAdmin):
    """Admin config for Store — lets staff review, moderate, and set affiliate links on storefronts."""
    # Columns shown in the admin change list; surfaces the key identifying/moderation fields at a glance.
    list_display = ['name', 'category', 'website_url', 'contact_email', 'is_active', 'created_at']
    # Sidebar filters — category to browse by vertical, is_active to find hidden/moderated stores.
    list_filter = ['category', 'is_active']
    # Fields searched by the admin search box — covers name, contact, and site URL lookups.
    search_fields = ['name', 'contact_email', 'website_url']
    # Server-derived fields shown but not editable — slug is auto-generated in Store.save(),
    # created_at/updated_at are auto-managed timestamps.
    readonly_fields = ['slug', 'created_at', 'updated_at']
    # Group fields into logical sections; "Links" holds the new bulk-link fields so
    # admins can paste shopping/offer URLs without scrolling through the whole form.
    fieldsets = [
        (None, {
            'fields': ['user', 'name', 'slug', 'logo', 'store_type', 'category', 'is_active'],
        }),
        ('URLs & Affiliate', {
            'fields': ['website_url', 'store_locator_url', 'affiliate_url', 'affiliate_network'],
        }),
        ('Shopping & Offer Links', {
            'description': 'Paste one URL per line in each box. Shopping links appear on the store card; Offers links appear in the Special Offers strip on the Shopping page.',
            'fields': ['shopping_links', 'offers_links'],
        }),
        ('Details', {
            'fields': ['description', 'tagline', 'contact_email', 'contact_phone'],
        }),
        ('Verification', {
            'fields': ['gst_number', 'pan_number', 'aadhar_number'],
        }),
        ('Timestamps', {
            'fields': ['created_at', 'updated_at'],
            'classes': ['collapse'],
        }),
    ]

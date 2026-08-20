# Django admin registration for the `subscriptions` app.
from django.contrib import admin

from .models import Plan, Subscription


@admin.register(Plan)
class PlanAdmin(admin.ModelAdmin):
    """Admin config for Plan — lets staff create/retire pricing tiers and set job limits."""
    # Surfaces pricing and the job-limit feature gate alongside active status at a glance.
    list_display = ['name', 'price', 'job_limit', 'duration_days', 'is_active']
    # Filter to quickly find retired vs. currently purchasable plans.
    list_filter = ['is_active']
    search_fields = ['name']


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    """Admin config for Subscription — lets staff review/manage subscriber billing records."""
    # Shows who's subscribed, to what plan, and the billing window at a glance;
    # useful for support/billing investigations.
    list_display = ['company', 'plan', 'status', 'start_date', 'end_date', 'created_at']
    # Filter by lifecycle state (active/expired/cancelled) to audit renewals or churn.
    list_filter = ['status']
    # Note: only searches by company name — subscriptions belonging to a direct
    # `user` (store owners, no Company record) aren't matched by this search field.
    search_fields = ['company__name']

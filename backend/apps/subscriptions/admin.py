from django.contrib import admin

from .models import Plan, Subscription


@admin.register(Plan)
class PlanAdmin(admin.ModelAdmin):
    list_display = ['name', 'price', 'job_limit', 'duration_days', 'is_active']
    list_filter = ['is_active']
    search_fields = ['name']


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ['company', 'plan', 'status', 'start_date', 'end_date', 'created_at']
    list_filter = ['status']
    search_fields = ['company__name']

from django.contrib import admin

from .models import Invoice, WebhookLog


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ['company', 'subscription', 'amount', 'gst_amount', 'created_at']
    search_fields = ['company__name', 'razorpay_payment_id']
    readonly_fields = ['created_at']


@admin.register(WebhookLog)
class WebhookLogAdmin(admin.ModelAdmin):
    list_display = ['event', 'processed', 'created_at']
    list_filter = ['processed', 'event']
    readonly_fields = ['created_at']

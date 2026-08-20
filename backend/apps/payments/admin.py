"""Django admin registrations for the payments app.

Gives staff visibility into generated `Invoice` records (for GST/billing
support) and the raw `WebhookLog` history received from Razorpay, useful
for debugging failed/duplicate subscription payment events.
"""

from django.contrib import admin

from .models import Invoice, WebhookLog


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    """Admin interface for generated subscription invoices.

    Lets support staff look up a company's billing history, e.g. to answer
    "why was I charged this amount" or to locate the Razorpay payment tied
    to an invoice.
    """
    # Key billing fields shown in the change list for at-a-glance review.
    list_display = ['company', 'subscription', 'amount', 'gst_amount', 'created_at']
    # Look up an invoice by company name or the Razorpay payment ID it was generated for.
    search_fields = ['company__name', 'razorpay_payment_id']
    readonly_fields = ['created_at']  # Set once at creation (auto_now_add); not editable afterwards.


@admin.register(WebhookLog)
class WebhookLogAdmin(admin.ModelAdmin):
    """Admin interface for raw Razorpay webhook delivery logs.

    Used to audit/debug incoming Razorpay events (e.g. confirming a
    `subscription.charged` event was received and processed, or replaying
    the raw payload when a webhook handler failed).
    """
    # Show the event type and whether it was successfully processed.
    list_display = ['event', 'processed', 'created_at']
    # Filter the log list by processing status or event type when triaging failures.
    list_filter = ['processed', 'event']
    readonly_fields = ['created_at']  # Set once at creation (auto_now_add); not editable afterwards.

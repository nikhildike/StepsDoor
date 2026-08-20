"""Models for the payments app.

Holds `Invoice` (billing records generated for a company's subscription
payment, including GST breakdown and a link to the rendered PDF) and
`WebhookLog` (a durable audit trail of every Razorpay webhook payload
received, used both for debugging and for idempotency checks so the same
event is not processed twice).
"""

from django.db import models


class Invoice(models.Model):
    """A billing invoice issued to a company for a subscription payment.

    Created after a successful Razorpay payment/subscription-charged event
    is processed (see the payments webhook handling flow), recording the
    charged amount, GST portion, and the path to the WeasyPrint-rendered
    PDF so it can be downloaded later from the company's Invoices page.
    """
    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,  # Remove invoices if the company record is deleted.
        related_name='invoices',  # Access via company.invoices.all().
    )
    subscription = models.ForeignKey(
        'subscriptions.Subscription',
        on_delete=models.CASCADE,  # Remove invoices if the subscription record is deleted.
        related_name='invoices',  # Access via subscription.invoices.all().
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2)  # Subscription charge amount, excluding GST, in INR.
    gst_amount = models.DecimalField(max_digits=10, decimal_places=2)  # GST portion charged on top of `amount`, in INR.
    # Filesystem/storage path (e.g. DigitalOcean Spaces key) to the WeasyPrint-generated
    # invoice PDF. Blank until the PDF has been generated.
    pdf_path = models.CharField(max_length=500, blank=True)
    # The Razorpay payment ID this invoice was generated for; ties the invoice back
    # to the Razorpay dashboard record. Blank if not yet linked to a payment.
    razorpay_payment_id = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)  # Timestamp set once, at creation, for ordering/auditing.

    class Meta:
        verbose_name = 'Invoice'
        verbose_name_plural = 'Invoices'
        ordering = ['-created_at']  # Most recent invoices first, e.g. on the company Invoices page.

    def __str__(self):
        """Human-readable representation shown in the Django admin and shell."""
        return f"Invoice #{self.pk} - {self.company.name}"


class WebhookLog(models.Model):
    """A raw, durable record of a single Razorpay webhook delivery.

    Written before/while processing each incoming Razorpay webhook POST
    (e.g. `subscription.charged`, `subscription.cancelled`,
    `payment.failed`) so the payload is never lost even if downstream
    processing fails, and so retried/duplicate deliveries from Razorpay can
    be detected and safely ignored.
    """
    event = models.CharField(max_length=100)  # Razorpay event type, e.g. "subscription.charged", "payment.failed".
    payload = models.JSONField()  # Full raw JSON body of the webhook request, kept for debugging/replay.
    processed = models.BooleanField(default=False)  # Whether the event has been successfully handled (idempotency flag).
    created_at = models.DateTimeField(auto_now_add=True)  # Timestamp set once, at creation, for ordering/auditing.

    class Meta:
        verbose_name = 'Webhook Log'
        verbose_name_plural = 'Webhook Logs'
        ordering = ['-created_at']  # Most recent webhook deliveries first.

    def __str__(self):
        """Human-readable representation shown in the Django admin and shell."""
        return f"{self.event} at {self.created_at}"

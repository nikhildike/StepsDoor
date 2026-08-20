"""API views for the payments app.

Note: these are read/management endpoints over records that are populated
elsewhere by Razorpay webhook processing (which creates `WebhookLog` and
`Invoice` rows) — this module does not itself define the public Razorpay
webhook receiver endpoint.
"""

from rest_framework import viewsets, permissions

from .models import Invoice, WebhookLog
from .serializers import InvoiceSerializer, WebhookLogSerializer


class InvoiceViewSet(viewsets.ReadOnlyModelViewSet):
    """List company invoices.

    Authenticated, read-only endpoint used by the company dashboard's
    Invoices page so a company user can view/download their own past
    subscription billing records (GST-inclusive amounts, PDF links).
    """
    serializer_class = InvoiceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Restrict invoices to those belonging to the requesting user's company."""
        return Invoice.objects.filter(
            company__user=self.request.user
        ).select_related('company', 'subscription')


class WebhookLogViewSet(viewsets.ModelViewSet):
    """Webhook log management (admin only in production).

    Full CRUD access over the raw Razorpay webhook delivery log, restricted
    to admin/staff users. Used for support and debugging — e.g. confirming
    whether a particular Razorpay event (subscription charge, cancellation,
    payment failure) was received and marked `processed`.
    """
    queryset = WebhookLog.objects.all()
    serializer_class = WebhookLogSerializer
    permission_classes = [permissions.IsAdminUser]

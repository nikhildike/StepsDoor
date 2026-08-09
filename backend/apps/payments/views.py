from rest_framework import viewsets, permissions

from .models import Invoice, WebhookLog
from .serializers import InvoiceSerializer, WebhookLogSerializer


class InvoiceViewSet(viewsets.ReadOnlyModelViewSet):
    """List company invoices."""
    serializer_class = InvoiceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Invoice.objects.filter(
            company__user=self.request.user
        ).select_related('company', 'subscription')


class WebhookLogViewSet(viewsets.ModelViewSet):
    """Webhook log management (admin only in production)."""
    queryset = WebhookLog.objects.all()
    serializer_class = WebhookLogSerializer
    permission_classes = [permissions.IsAdminUser]

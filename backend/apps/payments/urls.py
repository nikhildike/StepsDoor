"""URL routing for the payments app.

Wires `InvoiceViewSet` (read-only, authenticated) and `WebhookLogViewSet`
(admin-only) into a DRF router, mounted under whatever prefix this module
is included at in the project's root urls.py (e.g. `/api/payments/`).

Note: these are management/read endpoints for records already created by
webhook processing, not the public Razorpay webhook receiver itself.
"""

from django.urls import path, include
from rest_framework.routers import SimpleRouter

from . import views

router = SimpleRouter()
# Authenticated, read-only routes for a company to view its own invoices:
#   GET invoices/       - list the requesting company's invoices
#   GET invoices/{id}/  - retrieve a single invoice
router.register(r'invoices', views.InvoiceViewSet, basename='invoice')
# Admin-only CRUD routes over the raw Razorpay webhook delivery log, used for
# support/debugging (e.g. GET webhooks/ to review recent Razorpay events):
#   GET/POST/PUT/PATCH/DELETE webhooks/[{id}/]
router.register(r'webhooks', views.WebhookLogViewSet, basename='webhooklog')

urlpatterns = [
    path('', include(router.urls)),
]

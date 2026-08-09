from django.urls import path, include
from rest_framework.routers import SimpleRouter

from . import views

router = SimpleRouter()
router.register(r'invoices', views.InvoiceViewSet, basename='invoice')
router.register(r'webhooks', views.WebhookLogViewSet, basename='webhooklog')

urlpatterns = [
    path('', include(router.urls)),
]

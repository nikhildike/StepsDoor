"""URL routes for the `services` app, mounted at /api/services/ (see config/urls.py)."""
from django.urls import path

from .views import PublicServiceProviderListView

urlpatterns = [
    # GET /api/services/ — public list of active local service providers.
    path('', PublicServiceProviderListView.as_view(), name='service-provider-list'),
]

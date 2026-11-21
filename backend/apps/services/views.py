"""Views for the `services` app.

Covers the public-facing local Services directory (browse lawyers,
plumbers, mechanics, etc. by category/city/keyword) — no self-service
owner endpoint yet, since listings are admin-curated (see models.py).
"""
from rest_framework import generics, permissions
from rest_framework.filters import SearchFilter

from .models import ServiceProvider
from .serializers import ServiceProviderSerializer


class PublicServiceProviderListView(generics.ListAPIView):
    """Public list of active local service providers.

    Backs the mobile app's "Services" tab — open to anyone, no login
    required. Supports `?category=` (exact match against `SERVICE_CATEGORIES`
    codes) and `?city=` (case-insensitive exact match) filtering, plus
    `?search=` (icontains across name/description/address/city, via
    `SearchFilter`).
    """
    serializer_class = ServiceProviderSerializer
    permission_classes = [permissions.AllowAny]
    filter_backends = [SearchFilter]
    search_fields = ['name', 'description', 'address', 'city']

    def get_queryset(self):
        """Build the active-provider queryset, applying the optional `category`/`city` query params."""
        qs = ServiceProvider.objects.filter(is_active=True)
        category = self.request.query_params.get('category')
        if category:
            qs = qs.filter(category=category)
        city = self.request.query_params.get('city')
        if city:
            qs = qs.filter(city__iexact=city)
        return qs

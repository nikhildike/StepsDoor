"""Views for the `stores` app.

Covers the public-facing shopping pages (browse online stores / retail
chains, click-through to the store with affiliate link resolution) and the
store owner's self-service "My Store" endpoint.
"""
from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404

from .models import Store
from .serializers import StoreSerializer, StoreUpdateSerializer
from core.permissions import IsStoreOwner
from core.affiliate import build_affiliate_url


def _subscribed_store_qs(store_type):
    """Return a queryset of active subscribed stores filtered by store_type.

    Shared helper for the two public list views below. A store is only
    "subscribed" (and therefore publicly visible) if its owning user has at
    least one Subscription with status='active' and an end_date in the
    future — checked via both the direct `Subscription.user` FK (store
    owners) and `Subscription.company.user` FK (in case a company account
    also owns a store), since either represents "this user is subscribed".
    """
    from django.utils import timezone
    from django.db.models import Q
    from apps.subscriptions.models import Subscription
    active_subs = Subscription.objects.filter(status='active', end_date__gt=timezone.now())
    direct_user_ids  = active_subs.exclude(user=None).values_list('user_id', flat=True)
    company_user_ids = active_subs.exclude(company=None).values_list('company__user_id', flat=True)
    return Store.objects.filter(
        is_active=True,
        store_type=store_type,
    ).filter(Q(user_id__in=direct_user_ids) | Q(user_id__in=company_user_ids))


class PublicStoreListView(generics.ListAPIView):
    """Public list of active *online* stores with a live subscription.

    Backs the "Shop Online" page — open to anyone (job seekers browsing the
    site, no login required). Supports optional `?category=` filtering
    against STORE_CATEGORIES codes.
    """
    serializer_class = StoreSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        """Build the online-store queryset, applying the optional `category` query param."""
        qs = _subscribed_store_qs('online')
        category = self.request.query_params.get('category')
        if category:
            qs = qs.filter(category=category)
        return qs


class PublicRetailStoreListView(generics.ListAPIView):
    """Public list of active *retail* stores with a live subscription.

    Backs the "Retail Chains" page — same access model as
    `PublicStoreListView` but filtered to `store_type='retail'` and
    categorized against RETAIL_CATEGORIES codes.
    """
    serializer_class = StoreSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        """Build the retail-store queryset, applying the optional `category` query param."""
        qs = _subscribed_store_qs('retail')
        category = self.request.query_params.get('category')
        if category:
            qs = qs.filter(category=category)
        return qs


class StoreClickView(APIView):
    """Record a click on a subscribed store and return the best affiliate URL to redirect to.

    Called by the frontend when a job seeker clicks "Visit Store" — logs a
    `StoreClick` analytics event (IP + user agent, for click-tracking
    reporting) and resolves the outbound URL: the store's own
    `affiliate_url` if the admin set one, otherwise `website_url` with an
    Amazon affiliate tag injected automatically when applicable
    (see `core.affiliate.build_affiliate_url`).
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request, pk):
        """POST /api/stores/<pk>/click/ — log the click and return {redirect_url}."""
        store = get_object_or_404(Store, pk=pk, is_active=True)
        from apps.analytics.models import StoreClick
        StoreClick.objects.create(
            store=store,
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT', ''),
        )
        redirect_url = build_affiliate_url(store.website_url, store.affiliate_url or None)
        return Response({'redirect_url': redirect_url})


class MyStoreView(generics.RetrieveUpdateAPIView):
    """Retrieve or update the authenticated store owner's store.

    Backs the store owner's dashboard "My Store" page. Restricted to
    authenticated users flagged `is_store_owner` (see `IsStoreOwner`); always
    operates on the caller's own store, never one selected by ID, so an
    owner can only ever see/edit their own storefront.
    """
    permission_classes = [permissions.IsAuthenticated, IsStoreOwner]

    def get_object(self):
        """Return the calling user's own Store (via the `user.store` one-to-one), ignoring any pk in the URL."""
        return self.request.user.store

    def get_serializer_class(self):
        """Use the restricted write serializer on PUT/PATCH, the full read serializer on GET."""
        if self.request.method in ('PUT', 'PATCH'):
            return StoreUpdateSerializer
        return StoreSerializer

from rest_framework import generics, permissions
from .models import Store
from .serializers import StoreSerializer, StoreUpdateSerializer
from core.permissions import IsStoreOwner


def _subscribed_store_qs(store_type):
    """Return a queryset of active subscribed stores filtered by store_type."""
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
    """Public list of active *online* stores with a live subscription."""
    serializer_class = StoreSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        qs = _subscribed_store_qs('online')
        category = self.request.query_params.get('category')
        if category:
            qs = qs.filter(category=category)
        return qs


class PublicRetailStoreListView(generics.ListAPIView):
    """Public list of active *retail* stores with a live subscription."""
    serializer_class = StoreSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        qs = _subscribed_store_qs('retail')
        category = self.request.query_params.get('category')
        if category:
            qs = qs.filter(category=category)
        return qs


class MyStoreView(generics.RetrieveUpdateAPIView):
    """Retrieve or update the authenticated store owner's store."""
    permission_classes = [permissions.IsAuthenticated, IsStoreOwner]

    def get_object(self):
        return self.request.user.store

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return StoreUpdateSerializer
        return StoreSerializer

"""Views for the `subscriptions` app.

Exposes a public read-only plan catalogue plus an authenticated CRUD
endpoint for a subscriber's own subscriptions (used by both company and
store-owner accounts, since `Subscription` has FKs to both).
"""
from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Plan, Subscription
from .serializers import PlanSerializer, SubscriptionSerializer


class PlanViewSet(viewsets.ReadOnlyModelViewSet):
    """List available subscription plans — public.

    Backs the pricing page; no authentication required so anonymous
    visitors can see what's on offer before signing up. Only exposes plans
    with `is_active=True`, ordered cheapest-first.
    """
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    queryset = Plan.objects.filter(is_active=True).order_by('price')
    serializer_class = PlanSerializer


class SubscriptionViewSet(viewsets.ModelViewSet):
    """Manage subscriptions for both company and store owner users.

    Full CRUD (list/retrieve/create/update/delete) scoped to the
    authenticated caller's own subscriptions — used by the billing/
    subscription-management pages in the company and store-owner dashboards.
    """
    serializer_class = SubscriptionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def _user_filter(self):
        """Return a Q filter that matches subscriptions belonging to the current user.

        Matches on either FK since a subscriber may be a company account
        (`Subscription.company.user`) or a direct store-owner account
        (`Subscription.user`).
        """
        from django.db.models import Q
        return Q(company__user=self.request.user) | Q(user=self.request.user)

    def get_queryset(self):
        """Scope every list/retrieve/update/delete to subscriptions owned by the requesting user."""
        return Subscription.objects.filter(
            self._user_filter()
        ).select_related('plan', 'company', 'user')

    @action(detail=False, methods=['get'], url_path='current')
    def current(self, request):
        """GET /api/subscriptions/current/ — return the user's current active subscription, or {active: false}.

        Called by the frontend to decide whether to show "subscribe now"
        prompts or the active plan's details/limits. Only matches
        `status='active'` here (unlike the stricter `end_date` check used
        for public visibility gating elsewhere) since this is a
        self-service status check rather than an access-control decision.
        """
        from django.db.models import Q
        sub = (
            Subscription.objects
            .filter(
                Q(company__user=request.user) | Q(user=request.user),
                status='active',
            )
            .select_related('plan')
            .first()
        )
        if not sub:
            return Response({'active': False})
        return Response({'active': True, 'subscription': SubscriptionSerializer(sub).data})

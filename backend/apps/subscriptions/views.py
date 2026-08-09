from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Plan, Subscription
from .serializers import PlanSerializer, SubscriptionSerializer


class PlanViewSet(viewsets.ReadOnlyModelViewSet):
    """List available subscription plans — public."""
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    queryset = Plan.objects.filter(is_active=True).order_by('price')
    serializer_class = PlanSerializer


class SubscriptionViewSet(viewsets.ModelViewSet):
    """Manage subscriptions for both company and store owner users."""
    serializer_class = SubscriptionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def _user_filter(self):
        """Return a Q filter that matches subscriptions belonging to the current user."""
        from django.db.models import Q
        return Q(company__user=self.request.user) | Q(user=self.request.user)

    def get_queryset(self):
        return Subscription.objects.filter(
            self._user_filter()
        ).select_related('plan', 'company', 'user')

    @action(detail=False, methods=['get'], url_path='current')
    def current(self, request):
        """Return the user's current active subscription, or {active: false}."""
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

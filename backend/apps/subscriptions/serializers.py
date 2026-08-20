"""Serializers for the `subscriptions` app — plan listing and subscription read/write shapes."""
from rest_framework import serializers

from .models import Plan, Subscription


class PlanSerializer(serializers.ModelSerializer):
    """Full representation of a Plan.

    Used by `PlanViewSet` for the public pricing listing, and to embed
    plan details wherever a Subscription references its plan.
    """
    class Meta:
        model = Plan
        fields = '__all__'
        read_only_fields = ['id']


class SubscriptionSerializer(serializers.ModelSerializer):
    """Full representation of a Subscription, including a convenience `plan_name` field.

    Used by `SubscriptionViewSet` for listing/retrieving/creating a
    subscriber's own subscriptions and for the `current` action's response.
    """
    # Denormalized read-only convenience field so clients don't need a second
    # lookup just to display the plan's name alongside the subscription.
    plan_name = serializers.CharField(source='plan.name', read_only=True)

    class Meta:
        model = Subscription
        fields = '__all__'
        read_only_fields = ['id', 'created_at']

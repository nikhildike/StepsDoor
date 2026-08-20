"""Models for the `subscriptions` app.

Defines the billing plans companies (and store owners) can subscribe to
(`Plan`) and the record of each subscriber's purchased/active subscription
(`Subscription`). Subscriptions drive Razorpay billing and feature gating
across the site — e.g. how many jobs a company may post (`Plan.job_limit`)
and whether a store appears in the public shopping listings
(`Store.has_active_subscription` in `apps.stores`).
"""
from django.db import models
from django.conf import settings


class Plan(models.Model):
    """A subscription tier/pricing plan that companies or store owners can purchase.

    Managed via Django admin (`PlanAdmin`) and surfaced publicly read-only
    through `PlanViewSet` (e.g. for a pricing page). Encodes both the price
    charged via Razorpay and the feature limit (`job_limit`) granted while
    a Subscription on this plan is active.
    """
    name = models.CharField(max_length=100)  # plan display name, e.g. "Starter", "Pro"
    price = models.DecimalField(max_digits=10, decimal_places=2)  # price in INR for one billing cycle
    job_limit = models.IntegerField()  # max number of concurrent/active job postings allowed on this plan
    duration_days = models.IntegerField(default=30)  # length of one billing cycle in days; used to compute Subscription.end_date
    razorpay_plan_id = models.CharField(max_length=100, blank=True)  # corresponding plan ID in Razorpay, used when creating subscriptions via their API
    # Whether this plan can currently be purchased; lets staff retire old
    # pricing tiers without deleting historical Plan rows referenced by past Subscriptions.
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = 'Plan'
        verbose_name_plural = 'Plans'

    def __str__(self):
        """Return the plan name — used in Django admin dropdowns/list views and shell repr."""
        return self.name


class Subscription(models.Model):
    """A subscriber's purchase of a Plan for a fixed period.

    Created when a company or store owner completes checkout via Razorpay
    (webhook handling lives in `apps.payments`). "Active" status for feature
    gating purposes is NOT just `status == 'active'` — call sites also check
    `end_date` is in the future (see `apps.stores._subscribed_store_qs` and
    `Store.has_active_subscription`), since a Subscription's status field is
    only flipped to 'expired' by a periodic task rather than continuously.
    """
    # Distinguishes a subscription's current state. 'active' + not-yet-expired
    # end_date together mean "currently entitled"; 'expired'/'cancelled' are
    # terminal states used for history/reporting.
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('expired', 'Expired'),
        ('cancelled', 'Cancelled'),
    ]

    # nullable so store owners (who have no Company record) can also subscribe
    company = models.ForeignKey(
        'companies.Company',
        on_delete=models.CASCADE,  # deleting the company cascades to its subscription history
        related_name='subscriptions',
        null=True,
        blank=True,
    )
    # unified user FK for both companies and store owners
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,  # deleting the user cascades to their subscription history
        related_name='subscriptions',
        null=True,
        blank=True,
    )
    plan = models.ForeignKey(
        Plan,
        on_delete=models.PROTECT,  # prevent deleting a Plan that has subscription history tied to it
        related_name='subscriptions',
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')  # lifecycle state, see STATUS_CHOICES
    start_date = models.DateField()  # billing cycle start
    end_date = models.DateField()  # billing cycle end — combined with status=='active' to determine current entitlement
    razorpay_subscription_id = models.CharField(max_length=100, blank=True)  # Razorpay's subscription ID, used to reconcile webhook events
    created_at = models.DateTimeField(auto_now_add=True)  # record creation timestamp, set once

    class Meta:
        verbose_name = 'Subscription'
        verbose_name_plural = 'Subscriptions'
        ordering = ['-created_at']  # most recent subscription first, e.g. for "current subscription" lookups

    def __str__(self):
        """Return a human-readable summary ("Owner - Plan (status)") for Django admin and shell repr.

        Falls back through company -> user -> '?' since exactly one of
        `company`/`user` is expected to be set per subscription.
        """
        owner = self.company.name if self.company_id else (self.user.email if self.user_id else '?')
        return f"{owner} - {self.plan.name} ({self.status})"

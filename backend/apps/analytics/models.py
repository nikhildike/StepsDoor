"""Models for the `analytics` app: raw click-event records for job posts
and store storefronts. A JobClick row is written each time a job seeker
clicks through from a job listing to the company's careers page (or
similar apply action); StoreClick records the equivalent for storefront
visits. Aggregated, these feed the company analytics dashboard
(views/click counts, trends) via apps.analytics.views.JobClickViewSet and
related reporting."""

from django.db import models


class JobClick(models.Model):
    """A single click-through event on a private job listing.

    Created (typically by a public-facing "apply"/redirect endpoint in the
    jobs app, not shown here) whenever a job seeker clicks through from a
    JobPost to the company's external careers page. Read back via
    JobClickViewSet (GET /api/analytics/clicks/) to power the company
    analytics dashboard's click counts/trends for their own job posts.
    """
    job_post = models.ForeignKey(
        'jobs.JobPost',
        on_delete=models.CASCADE,  # delete click history if the job post itself is deleted
        related_name='click_events',  # access via job_post.click_events.all()
    )
    ip_address = models.GenericIPAddressField(null=True, blank=True)  # visitor IP, captured for basic dedup/fraud checks; may be unknown behind some proxies
    user_agent = models.TextField(blank=True)  # raw User-Agent header from the click request, for device/browser breakdowns
    clicked_at = models.DateTimeField(auto_now_add=True)  # timestamp set once at creation; used for trend charts and ordering

    class Meta:
        verbose_name = 'Job Click'
        verbose_name_plural = 'Job Clicks'
        ordering = ['-clicked_at']  # most recent clicks first, matching how analytics views typically display them

    def __str__(self):
        """Human-readable label used in the Django admin list/detail views."""
        return f"Click on {self.job_post} at {self.clicked_at}"


class StoreClick(models.Model):
    """A single click-through/visit event on a company storefront listing.

    Mirrors JobClick but for the `stores` app's Store model (company
    storefront/catalogue pages). Written whenever a visitor clicks into a
    Store listing; intended to feed the same kind of analytics reporting
    for storefronts as JobClick does for job posts, though there is
    currently no dedicated viewset/serializer wired up for it.
    """
    store = models.ForeignKey(
        'stores.Store',
        on_delete=models.CASCADE,  # delete click history if the store itself is deleted
        related_name='click_events',  # access via store.click_events.all()
    )
    ip_address = models.GenericIPAddressField(null=True, blank=True)  # visitor IP, captured for basic dedup/fraud checks; may be unknown behind some proxies
    user_agent = models.TextField(blank=True)  # raw User-Agent header from the click request, for device/browser breakdowns
    clicked_at = models.DateTimeField(auto_now_add=True)  # timestamp set once at creation; used for trend charts and ordering

    class Meta:
        verbose_name = 'Store Click'
        verbose_name_plural = 'Store Clicks'
        ordering = ['-clicked_at']  # most recent clicks first, matching how analytics views typically display them

    def __str__(self):
        """Human-readable label used in the Django admin list/detail views."""
        return f"Click on {self.store} at {self.clicked_at}"

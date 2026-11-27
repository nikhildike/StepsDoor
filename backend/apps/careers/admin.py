"""Django admin for careers sources and their jobs.

Admins switch a company off here (e.g. on a removal request — do it the same
day), see failing feeds (`last_status`, `consecutive_failures`), and can
fetch a source immediately with the "Fetch now" action.
"""
from django.contrib import admin, messages

from .ats import PoliteFetcher
from .models import CareerJob, CareerSource
from .sync import sync_source


@admin.register(CareerSource)
class CareerSourceAdmin(admin.ModelAdmin):
    """Registry of company ATS feeds, with fetch health columns and a "Fetch now" action."""
    list_display = ['company_name', 'ats', 'ats_slug', 'is_active', 'last_status', 'consecutive_failures',
                    'last_fetched_at']
    list_filter = ['ats', 'is_active', 'last_status', 'sector']
    search_fields = ['company_name', 'ats_slug']
    readonly_fields = ['last_fetched_at', 'last_status', 'last_error', 'consecutive_failures', 'created_at', 'updated_at']
    actions = ['fetch_now']

    @admin.action(description='Fetch now')
    def fetch_now(self, request, queryset):
        """Run `sync_source` for the selected sources and report each result as an admin message."""
        fetcher = PoliteFetcher()
        for source in queryset:
            r = sync_source(source, fetcher)
            if r.error:
                self.message_user(request, f'{source}: failed - {r.error}', messages.ERROR)
            else:
                self.message_user(request, f'{source}: {r.created} new, {r.updated} updated, {r.deactivated} closed')


@admin.register(CareerJob)
class CareerJobAdmin(admin.ModelAdmin):
    """Read-mostly view of fetched jobs (they're overwritten by the next fetch, so edits don't stick)."""
    list_display = ['title', 'source', 'location', 'posted_at', 'is_active', 'last_seen_at']
    list_filter = ['is_active', 'source__ats']
    search_fields = ['title', 'source__company_name', 'location']
    raw_id_fields = ['source']

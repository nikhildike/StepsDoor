"""
Django admin configuration for the `tenders` app.

Registers admin screens for browsing scraped tenders, managing user tender alerts, viewing
scrape-run history, and — most importantly — the `/admin/tenders/scrapersource/` page, which
is the primary tool staff use to onboard new government portals into the scrape pipeline
(see ScraperSourceAdmin below).
"""
from django.contrib import admin
from django.contrib import messages
from django.shortcuts import render, redirect
from django.urls import path
from import_export.admin import ImportExportModelAdmin
from .models import Tender, TenderAlert, ScraperLog, ScraperSource
from .resources import TenderResource, ScraperSourceResource


@admin.register(Tender)
class TenderAdmin(ImportExportModelAdmin):
    """
    Admin screen for browsing/searching scraped tenders and bulk import/export via CSV/Excel.

    Tenders themselves are created/updated by the scrape pipeline (`TenderPipeline`), not
    typically hand-entered here — this screen is mainly for staff to inspect scrape output,
    spot-check data quality, or bulk-import tenders from an external source via
    `TenderResource`.
    """
    resource_classes = [TenderResource]
    # Columns chosen to give a quick health/quality check of scraped data at a glance
    # (which portal it came from, key dates/values) without opening each record.
    list_display = ['title', 'organisation', 'state', 'category', 'estimated_value', 'submission_deadline', 'is_active', 'source_portal']
    list_filter = ['state', 'category', 'is_active', 'source_portal']  # lets staff isolate tenders from one portal/state/category, e.g. to debug a specific scraper
    search_fields = ['title', 'organisation', 'tender_id']
    readonly_fields = ['search_vector', 'created_at', 'updated_at']  # search_vector is derived (see Tender.save()); timestamps are auto-managed — none should be hand-edited
    date_hierarchy = 'published_at'
    list_per_page = 50


@admin.register(TenderAlert)
class TenderAlertAdmin(admin.ModelAdmin):
    """
    Admin screen for inspecting job seekers' saved tender-search alerts.

    Mainly used to debug `match_tender_alerts` behavior (e.g. confirming an alert's filters
    are what a user expects) rather than for staff to create alerts themselves.
    """
    list_display = ['user', 'keyword', 'state', 'category', 'min_value', 'is_active', 'created_at']
    list_filter = ['is_active', 'state', 'category']
    search_fields = ['user__email', 'keyword']


@admin.register(ScraperLog)
class ScraperLogAdmin(admin.ModelAdmin):
    """
    Read-only admin screen for scrape-run history, written by `apps.tenders.tasks.scrape_portal`.

    This is the primary place staff check to see whether the every-6-hours scheduled scrapes
    are succeeding, and to read `error_message` when a portal starts failing.
    """
    list_display = ['portal', 'status', 'tenders_found', 'tenders_new', 'started_at', 'finished_at']
    list_filter = ['portal', 'status']  # filter by portal to check one source's history, or by status to find recent failures
    readonly_fields = ['portal', 'status', 'tenders_found', 'tenders_new', 'error_message', 'started_at', 'finished_at']  # entire log is system-written; nothing here should be hand-edited

    def has_add_permission(self, request):
        """Disable manual creation of log rows — ScraperLog entries only make sense as output of an actual scrape run."""
        return False


@admin.register(ScraperSource)
class ScraperSourceAdmin(ImportExportModelAdmin):
    """
    Admin screen for the portal registry — THE primary tool for onboarding a new government
    portal into the scrape pipeline.

    For a standard NIC-eProcurement-style portal, onboarding is just: add a row here with a
    URL and source_type (tender/govt_job); `ScraperSource.save()` auto-derives
    source_portal/name/spider_name so no other field is required. This page also exposes a
    custom "bulk add URLs" view for registering many portals at once, and a "scrape now"
    admin action that queues an immediate Celery scrape without waiting for the next
    Beat-scheduled run.
    """
    resource_classes = [ScraperSourceResource]
    list_display = ['name', 'source_portal', 'source_type', 'spider_name', 'state', 'is_active', 'last_scraped_at']
    list_filter = ['source_type', 'is_active', 'spider_name']  # source_type separates tender vs govt_job portals; spider_name surfaces which sources use the generic spider vs a custom one
    search_fields = ['name', 'source_portal', 'url']
    readonly_fields = ['source_portal', 'last_scraped_at', 'created_at']  # source_portal is auto-derived in save(); last_scraped_at/created_at are system-stamped
    list_per_page = 50
    actions = ['scrape_now']
    change_list_template = 'admin/tenders/scrapersource/change_list.html'  # adds the "Bulk Add URLs" button to the change list toolbar

    def get_urls(self):
        """Register the custom bulk-add-URLs view alongside the default ImportExportModelAdmin URLs."""
        urls = super().get_urls()
        custom = [
            path('bulk-add-urls/', self.admin_site.admin_view(self.bulk_add_urls_view), name='tenders_scrapersource_bulk_add'),
        ]
        return custom + urls

    def bulk_add_urls_view(self, request):
        """
        Custom admin view: paste one URL per line, choose whether they are tender or govt
        job portals, and create a `ScraperSource` row for each new one in a single submit.

        GET renders the paste-a-list form; POST processes it. Reached via the "Bulk Add
        URLs" button in the change list toolbar (see `change_list_template`) — the fast path
        for onboarding many portals of the same type at once instead of one-by-one via the
        standard add-row admin form.
        """
        added, skipped = 0, 0
        if request.method == 'POST':
            raw = request.POST.get('urls', '')
            source_type = request.POST.get('source_type', ScraperSource.TYPE_TENDER)
            for line in raw.splitlines():
                url = line.strip()
                if not url or not url.startswith('http'):
                    continue
                _, created = ScraperSource.objects.get_or_create(
                    url=url,
                    defaults={'source_type': source_type},
                )
                if created:
                    added += 1
                else:
                    skipped += 1
            messages.success(request, f'Added {added} new source(s). {skipped} already existed.')
            return redirect('../')
        return render(request, 'admin/tenders/scrapersource/bulk_add_urls.html', {
            'title': 'Bulk Add Portal URLs',
            'opts': self.model._meta,
            'source_type_choices': ScraperSource.SOURCE_TYPE_CHOICES,
        })

    @admin.action(description='Scrape selected sources now (queues Celery task)')
    def scrape_now(self, request, queryset):
        """
        Admin bulk action: queue an immediate Celery scrape for the selected, active sources.

        Routes each source to `apps.tenders.tasks.scrape_portal` or
        `apps.govtjobs.tasks.scrape_govtjob_portal` depending on `source_type`, bypassing the
        Celery Beat schedule — useful right after registering a new portal, to verify it
        scrapes correctly without waiting up to 6 hours for the next scheduled run.
        """
        from apps.tenders.tasks import scrape_portal
        from apps.govtjobs.tasks import scrape_govtjob_portal
        queued = 0
        for source in queryset.filter(is_active=True):
            if source.source_type == ScraperSource.TYPE_GOVT_JOB:
                scrape_govtjob_portal.delay(source.source_portal)
            else:
                scrape_portal.delay(source.source_portal)
            queued += 1
        if queued:
            self.message_user(request, f'Queued {queued} scrape task(s). Check Scraper Logs for results.', messages.SUCCESS)
        skipped = queryset.filter(is_active=False).count()
        if skipped:
            self.message_user(request, f'{skipped} inactive source(s) skipped.', messages.WARNING)

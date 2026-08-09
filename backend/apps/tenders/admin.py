from django.contrib import admin
from django.contrib import messages
from django.shortcuts import render, redirect
from django.urls import path
from import_export.admin import ImportExportModelAdmin
from .models import Tender, TenderAlert, ScraperLog, ScraperSource
from .resources import TenderResource, ScraperSourceResource


@admin.register(Tender)
class TenderAdmin(ImportExportModelAdmin):
    resource_classes = [TenderResource]
    list_display = ['title', 'organisation', 'state', 'category', 'estimated_value', 'submission_deadline', 'is_active', 'source_portal']
    list_filter = ['state', 'category', 'is_active', 'source_portal']
    search_fields = ['title', 'organisation', 'tender_id']
    readonly_fields = ['search_vector', 'created_at', 'updated_at']
    date_hierarchy = 'published_at'
    list_per_page = 50


@admin.register(TenderAlert)
class TenderAlertAdmin(admin.ModelAdmin):
    list_display = ['user', 'keyword', 'state', 'category', 'min_value', 'is_active', 'created_at']
    list_filter = ['is_active', 'state', 'category']
    search_fields = ['user__email', 'keyword']


@admin.register(ScraperLog)
class ScraperLogAdmin(admin.ModelAdmin):
    list_display = ['portal', 'status', 'tenders_found', 'tenders_new', 'started_at', 'finished_at']
    list_filter = ['portal', 'status']
    readonly_fields = ['portal', 'status', 'tenders_found', 'tenders_new', 'error_message', 'started_at', 'finished_at']

    def has_add_permission(self, request):
        return False


@admin.register(ScraperSource)
class ScraperSourceAdmin(ImportExportModelAdmin):
    resource_classes = [ScraperSourceResource]
    list_display = ['name', 'source_portal', 'source_type', 'spider_name', 'state', 'is_active', 'last_scraped_at']
    list_filter = ['source_type', 'is_active', 'spider_name']
    search_fields = ['name', 'source_portal', 'url']
    readonly_fields = ['source_portal', 'last_scraped_at', 'created_at']
    list_per_page = 50
    actions = ['scrape_now']
    change_list_template = 'admin/tenders/scrapersource/change_list.html'

    def get_urls(self):
        urls = super().get_urls()
        custom = [
            path('bulk-add-urls/', self.admin_site.admin_view(self.bulk_add_urls_view), name='tenders_scrapersource_bulk_add'),
        ]
        return custom + urls

    def bulk_add_urls_view(self, request):
        """Paste one URL per line, choose whether they are tender or govt job portals."""
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

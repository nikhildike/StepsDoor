"""
Management command to run all active scrapers immediately (no Celery needed).

Usage:
    python manage.py run_scrapers                  # run all active sources
    python manage.py run_scrapers --type tender    # tenders only
    python manage.py run_scrapers --type govt_job  # govt jobs only
    python manage.py run_scrapers --portal mahatenders.gov.in  # one portal
"""
import os
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Run all active scrapers and save results to the database'

    def add_arguments(self, parser):
        parser.add_argument(
            '--type', choices=['tender', 'govt_job'],
            help='Only run sources of this type',
        )
        parser.add_argument(
            '--portal',
            help='Only run this specific source_portal (e.g. mahatenders.gov.in)',
        )

    def handle(self, *args, **options):
        from scrapy.crawler import CrawlerProcess
        from scrapy.utils.project import get_project_settings
        from apps.tenders.models import ScraperSource

        os.environ.setdefault('SCRAPY_SETTINGS_MODULE', 'scrapers.settings')

        qs = ScraperSource.objects.filter(is_active=True)
        if options['type']:
            qs = qs.filter(source_type=options['type'])
        if options['portal']:
            qs = qs.filter(source_portal=options['portal'])

        sources = list(qs)
        if not sources:
            self.stdout.write(self.style.WARNING('No active scraper sources found.'))
            return

        self.stdout.write(f'Running {len(sources)} scraper(s)...\n')

        if len(sources) > 50:
            self.stdout.write(self.style.WARNING(
                f'Warning: {len(sources)} sources is large. Scrapy will rate-limit requests '
                f'(DOWNLOAD_DELAY=3s), so this may take a long time.\n'
                f'Tip: use --portal to run one at a time, or --type to filter.\n'
            ))

        settings = get_project_settings()
        process = CrawlerProcess(settings)

        for source in sources:
            self.stdout.write(f'  -> [{source.get_source_type_display()}] {source.name} ({source.url})')
            process.crawl(
                source.spider_name,
                start_url=source.url,
                source_portal=source.source_portal,
            )

        process.start()  # blocks until all spiders finish

        self.stdout.write(self.style.SUCCESS('\nDone. Check the database for results.'))

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
    """
    `python manage.py run_scrapers` — manual CLI entrypoint for running scrapers outside Celery.

    Runs the same spiders as the `scrape_portal`/`scrape_govtjob_portal` Celery tasks, but
    synchronously in the current process against every (or a filtered subset of) active
    `ScraperSource` rows — useful for local development or one-off manual runs where spinning
    up Celery Beat/worker isn't desired. Does not write `ScraperLog` rows (that bookkeeping
    is specific to the Celery task path).
    """
    help = 'Run all active scrapers and save results to the database'

    def add_arguments(self, parser):
        """Register the optional --type and --portal CLI flags for narrowing which sources run."""
        parser.add_argument(
            '--type', choices=['tender', 'govt_job'],
            help='Only run sources of this type',
        )
        parser.add_argument(
            '--portal',
            help='Only run this specific source_portal (e.g. mahatenders.gov.in)',
        )

    def handle(self, *args, **options):
        """
        Entry point Django calls when this command is invoked from the CLI.

        Builds a Scrapy `CrawlerProcess`, queues one `process.crawl(...)` per matching active
        `ScraperSource` (optionally filtered by `--type`/`--portal`), then blocks until every
        queued spider finishes. Manual/local alternative to the Celery-driven
        `scrape_all_portals` schedule.
        """
        from scrapy.crawler import CrawlerProcess
        from scrapy.utils.project import get_project_settings
        from apps.tenders.models import ScraperSource

        # Scrapy needs its settings module resolvable before any scrapy import runs project
        # code; setdefault so an already-configured env (e.g. under Celery) isn't overridden.
        os.environ.setdefault('SCRAPY_SETTINGS_MODULE', 'scrapers.settings')

        qs = ScraperSource.objects.filter(is_active=True)  # inactive sources are never run, manually or on schedule
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
            # DOWNLOAD_DELAY=3s (in scrapers/settings.py) is intentional to avoid hammering
            # government portals — but that means many sources run serially-ish and can take
            # a long time in this synchronous, single-process command, unlike the Celery path
            # where each portal is a separate task dispatched independently.
            self.stdout.write(self.style.WARNING(
                f'Warning: {len(sources)} sources is large. Scrapy will rate-limit requests '
                f'(DOWNLOAD_DELAY=3s), so this may take a long time.\n'
                f'Tip: use --portal to run one at a time, or --type to filter.\n'
            ))

        settings = get_project_settings()
        process = CrawlerProcess(settings)

        for source in sources:
            self.stdout.write(f'  -> [{source.get_source_type_display()}] {source.name} ({source.url})')
            # Queue this source's spider; nothing runs yet until process.start() below —
            # CrawlerProcess runs all queued crawls concurrently within one reactor.
            process.crawl(
                source.spider_name,
                start_url=source.url,
                source_portal=source.source_portal,
            )

        process.start()  # blocks until all spiders finish

        self.stdout.write(self.style.SUCCESS('\nDone. Check the database for results.'))

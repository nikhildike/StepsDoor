"""Fetch careers jobs now, outside the Celery schedule.

    python manage.py fetch_career_jobs                 # every active source
    python manage.py fetch_career_jobs --source 3 7    # specific source ids (inactive ones too)
    python manage.py fetch_career_jobs --ats workday
"""
from django.core.management.base import BaseCommand

from apps.careers.ats import PoliteFetcher
from apps.careers.models import CareerSource
from apps.careers.sync import sync_source


class Command(BaseCommand):
    """`fetch_career_jobs`: run `sync_source` for the chosen sources and print the counts."""

    help = 'Fetch private-company careers jobs now (same work as the scheduled Celery task).'

    def add_arguments(self, parser):
        """--source ids and --ats filter."""
        parser.add_argument('--source', type=int, nargs='+', help='CareerSource ids (works on inactive sources)')
        parser.add_argument('--ats', choices=CareerSource.Ats.values, help='Only sources on this ATS')

    def handle(self, *args, source=None, ats=None, **opts):
        """Fetch each source in turn with one shared polite fetcher; ASCII output only (Windows consoles)."""
        qs = CareerSource.objects.filter(id__in=source) if source else CareerSource.objects.filter(is_active=True)
        if ats:
            qs = qs.filter(ats=ats)
        fetcher = PoliteFetcher()
        for src in qs:
            r = sync_source(src, fetcher)
            name = str(src).encode('ascii', 'replace').decode()
            if r.error:
                self.stdout.write(self.style.ERROR(f'  FAILED {name}: {r.error}'.encode('ascii', 'replace').decode()))
            else:
                self.stdout.write(f'  ok {name}: {r.created} new, {r.updated} updated, {r.deactivated} closed')

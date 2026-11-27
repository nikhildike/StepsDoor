"""Create `CareerSource` rows from the `classify_careers_ats` CSV.

Only rows whose ATS has an adapter (Greenhouse, Lever, Workday, Oracle) are
imported. Existing sources (same ATS + slug) get their name/sector/URL
refreshed but keep their `is_active` setting, so a company switched off on
request stays off after a re-import.

    python manage.py import_career_sources careers_ats.csv [--dry-run]
"""
import csv
import re

from django.core.management.base import BaseCommand, CommandError

from apps.careers.models import CareerSource

_WORKDAY_RE = re.compile(r'([a-z0-9-]+\.wd\d+\.myworkdayjobs\.com)/(?:[a-z]{2}-[A-Z]{2}/)?([A-Za-z0-9_-]+)', re.I)
_ORACLE_HOST_RE = re.compile(r'([a-z0-9-]+(?:\.[a-z0-9-]+)*\.oraclecloud\.com)', re.I)
_ORACLE_SITE_RE = re.compile(r'/sites/([A-Za-z0-9_]+)')


def source_slug(row):
    """Return the `ats_slug` for a classifier CSV row, or None if the row can't be imported.

    Greenhouse/Lever use the classifier's slug. Workday needs 'host/site' and
    Oracle 'host/siteNumber', recovered from the evidence and URLs (Oracle
    defaults to site CX_1, the most common; a wrong site shows up as a failed fetch).
    """
    ats, slug = row.get('ats', ''), row.get('ats_slug', '')
    text = ' '.join([row.get('evidence', ''), row.get('final_url', ''), row.get('careers_url', '')])
    if ats in ('greenhouse', 'lever'):
        return slug or None
    if ats == 'workday':
        m = _WORKDAY_RE.search(text)
        return f'{m.group(1).lower()}/{m.group(2)}' if m else None
    if ats == 'oracle_hcm':
        host = _ORACLE_HOST_RE.search(text)
        site = _ORACLE_SITE_RE.search(text)
        return f'{host.group(1).lower()}/{site.group(1) if site else "CX_1"}' if host else None
    return None


class Command(BaseCommand):
    """`import_career_sources <csv>`: register companies on supported ATSs as careers sources."""

    help = 'Create CareerSource rows from classify_careers_ats output (supported ATSs only).'

    def add_arguments(self, parser):
        """CSV path and --dry-run."""
        parser.add_argument('csv_path', help='Output of manage.py classify_careers_ats')
        parser.add_argument('--dry-run', action='store_true', help='Show what would be imported without saving')

    def handle(self, *args, csv_path, dry_run, **opts):
        """Import every supported row; prints one ASCII line per source."""
        try:
            rows = list(csv.DictReader(open(csv_path, newline='', encoding='utf-8')))
        except OSError as exc:
            raise CommandError(str(exc))
        supported = set(CareerSource.Ats.values)
        created = updated = 0
        for row in rows:
            if row.get('ats') not in supported:
                continue
            slug = source_slug(row)
            if not slug:
                self.stdout.write(f"  skip {row['name']}: no {row['ats']} id found")
                continue
            label = f"{row['name']} -> {row['ats']} {slug}".encode('ascii', 'replace').decode()
            if dry_run:
                self.stdout.write(f'  would import {label}')
                continue
            _, was_created = CareerSource.objects.update_or_create(
                ats=row['ats'], ats_slug=slug,
                defaults={'company_name': row['name'], 'sector': row.get('sector', ''),
                          'careers_url': row.get('careers_url', '')},
            )
            created += was_created
            updated += not was_created
            self.stdout.write(f"  {'created' if was_created else 'updated'} {label}")
        self.stdout.write(self.style.SUCCESS(f'{created} created, {updated} updated'))

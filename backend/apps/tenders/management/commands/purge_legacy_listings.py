"""
Management command to delete tenders and govt jobs saved by the retired generic spiders.

Usage:
    python manage.py purge_legacy_listings --dry-run   # counts + samples, deletes nothing
    python manage.py purge_legacy_listings             # delete

Before the NIC tender spider and the dedicated recruiter spiders (upsc, ssc, ibps,
rrb), the generic "scrape any table" spiders saved navigation links, results, admit
cards and corrigenda as listings, keyed by whatever text sat in a cell. Those rows
never get a deadline or a re-scrape under the same key, so they would stay visible
forever next to properly keyed duplicates. Current spiders key rows recognisably,
and this command keeps exactly those:

  - Tender:  `tender_id` is an NIC Tender ID (e.g. 2026_HRY_562238_1)
  - GovtJob: `job_id` starts with a dedicated spider's prefix (CURRENT_JOB_ID_PREFIXES)

Nothing references Tender or GovtJob by foreign key (alerts match by filters), so
deleting cascades to nothing. Run once per environment; safe to re-run.
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Q

from apps.govtjobs.models import GovtJob
from apps.tenders.models import Tender

# Same shape generic_tender_spider validates before saving (2026_HRY_562238_1).
NIC_TENDER_ID_REGEX = r'^\d{4}_[A-Za-z0-9]{2,20}_\d{3,9}_\d{1,3}$'
# job_id prefixes used by the dedicated govt-job spiders in scrapers/spiders/:
# upsc (exam:, advt:), ssc (exam:), ibps (rec:, crp:), rrb (cen:).
CURRENT_JOB_ID_PREFIXES = ('exam:', 'advt:', 'rec:', 'crp:', 'cen:')


def legacy_tenders():
    """Tenders not keyed by an NIC Tender ID — saved by the old generic table scraper."""
    return Tender.objects.exclude(tender_id__regex=NIC_TENDER_ID_REGEX)


def legacy_govt_jobs():
    """Govt jobs whose job_id has no dedicated-spider prefix — saved by generic_govtjob."""
    current = Q()
    for prefix in CURRENT_JOB_ID_PREFIXES:
        current |= Q(job_id__startswith=prefix)
    return GovtJob.objects.exclude(current)


class Command(BaseCommand):
    """
    `python manage.py purge_legacy_listings` — one-off clean-up after the spider rewrite.
    Prints counts per portal and a few sample titles, then deletes (unless --dry-run)
    inside one transaction.
    """
    help = 'Delete tenders/govt jobs saved by the retired generic spiders'

    def add_arguments(self, parser):
        """Register --dry-run."""
        parser.add_argument('--dry-run', action='store_true', help='Report what would be deleted without deleting')

    def handle(self, *args, **options):
        """Report, then delete both legacy sets atomically."""
        from django.db.models import Count

        for label, qs, total in (
            ('Tenders', legacy_tenders(), Tender.objects.count()),
            ('Govt jobs', legacy_govt_jobs(), GovtJob.objects.count()),
        ):
            n = qs.count()
            self.stdout.write(f'{label}: {n} legacy of {total} ({total - n} kept)')
            for row in qs.values('source_portal').annotate(n=Count('id')).order_by('-n')[:8]:
                self.stdout.write(f"    {row['n']:5}  {row['source_portal']}")
            for title in qs.values_list('title', flat=True)[:3]:
                self.stdout.write(f'    e.g. {title[:80]!r}')

        if options['dry_run']:
            self.stdout.write(self.style.WARNING('Dry run — nothing deleted.'))
            return

        with transaction.atomic():
            tenders_deleted, _ = legacy_tenders().delete()
            jobs_deleted, _ = legacy_govt_jobs().delete()
        self.stdout.write(self.style.SUCCESS(f'Deleted {tenders_deleted} tender(s) and {jobs_deleted} govt job(s).'))

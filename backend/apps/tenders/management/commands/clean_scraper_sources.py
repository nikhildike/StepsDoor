"""
Management command to tidy the ScraperSource registry and flag what can't be scraped.

Usage:
    python manage.py clean_scraper_sources --dry-run   # show what would change
    python manage.py clean_scraper_sources             # apply
    python manage.py clean_scraper_sources --no-probe  # skip the network check

Safe to re-run: it only rewrites rows whose URL still carries a note, and only
overwrites the notes it wrote itself (lines starting with "[auto]").
"""
from urllib.parse import urlparse

import httpx
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.tenders.models import ScraperSource

# Prefix for notes this command writes, so re-runs replace them instead of stacking.
AUTO = '[auto]'
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'

GOVTJOB_NOTE = (
    f'{AUTO} The generic govt-job spider is not used (it mostly saved results, admit cards and '
    'menu links). Needs a dedicated spider before this source is switched on.'
)


def _nic_home(url):
    """The NIC eProcurement home page a tender source would be crawled from (see generic_tender)."""
    parsed = urlparse(url)
    app = '/eprocure/app' if parsed.netloc.endswith('eprocure.gov.in') else '/nicgep/app'
    return f'https://{parsed.netloc}{app}'


class Command(BaseCommand):
    """
    `python manage.py clean_scraper_sources` — one-off/occasional registry clean-up.

    1. Moves notes typed after a URL ("https://x.gov.in (tenders)", "... + mahatenders")
       out of `url` into `notes`, and re-derives `source_portal`/`name` from the clean
       URL. If the clean URL is already registered, the row keeps its URL and gets a note.
    2. With probing on (default), checks each tender source using the `generic_tender`
       spider for an NIC "Latest Tenders" table. Non-NIC sources are switched off with a
       note — that spider only understands NIC eProcurement portals.
    3. Notes on every generic govt-job source that it's off pending a dedicated spider,
       and switches those off.

    Never deletes rows and never switches a source on; activation stays a manual
    decision after a test run (see `run_source` in CLAUDE.md).
    """
    help = 'Move notes out of ScraperSource URLs and flag/disable sources the spiders cannot scrape'

    def add_arguments(self, parser):
        """Register --dry-run and --no-probe."""
        parser.add_argument('--dry-run', action='store_true', help='Print changes without saving')
        parser.add_argument('--no-probe', action='store_true', help="Don't fetch portals to check for NIC")

    def handle(self, *args, **options):
        """Apply the three passes described on the class, printing one line per changed row."""
        dry = options['dry_run']
        changed = 0
        client = None if options['no_probe'] else httpx.Client(
            headers={'User-Agent': UA}, timeout=25, follow_redirects=True,
            # Scrapy doesn't verify TLS certificates either, and several govt portals
            # serve broken chains — verifying here would misreport them as unreachable.
            verify=False,
        )
        try:
            with transaction.atomic():
                for source in ScraperSource.objects.order_by('source_type', 'url'):
                    notes = [line for line in source.notes.splitlines() if not line.startswith(AUTO)]
                    auto = []
                    before = (source.url, source.source_portal, source.name, source.is_active)

                    # 1. Split "URL <note>" into URL + note.
                    parts = source.url.split(None, 1)
                    if len(parts) == 2:
                        clean_url, annotation = parts
                        auto.append(f'{AUTO} Imported URL carried the note: {annotation!r}.')
                        if ScraperSource.objects.filter(url=clean_url).exclude(pk=source.pk).exists():
                            auto.append(f'{AUTO} {clean_url} is already registered as another source; URL left as imported.')
                        else:
                            source.url = clean_url
                        domain = urlparse(clean_url).netloc.lower().removeprefix('www.')
                        source.source_portal = domain
                        if not source.name or source.name != source.name.strip() or ' ' in source.name:
                            source.name = domain

                    # 2. Tender sources on the generic spider must be NIC portals.
                    if source.source_type == ScraperSource.TYPE_TENDER and source.spider_name == 'generic_tender':
                        if client is not None:
                            is_nic = self._probe_nic(client, source.url.split()[0])
                            if is_nic is False:
                                auto.append(
                                    f'{AUTO} Not an NIC eProcurement portal (no "Latest Tenders" table at '
                                    f'{_nic_home(source.url.split()[0])}); generic_tender cannot scrape it. '
                                    'Needs a dedicated spider, or drop it if its tenders are already on a state NIC portal.'
                                )
                                source.is_active = False
                            elif is_nic is None:
                                auto.append(f'{AUTO} Portal unreachable when checked; re-run this command to classify it.')

                    # 3. Generic govt-job sources stay off until they get dedicated spiders.
                    if source.source_type == ScraperSource.TYPE_GOVT_JOB and source.spider_name == 'generic_govtjob':
                        auto.append(GOVTJOB_NOTE)
                        source.is_active = False

                    new_notes = '\n'.join(notes + auto)
                    after = (source.url, source.source_portal, source.name, source.is_active)
                    if after != before or new_notes != source.notes:
                        changed += 1
                        source.notes = new_notes
                        self.stdout.write(f'[{source.source_type}] {before[0]!r} -> {source.url!r} active={source.is_active}')
                        if not dry:
                            source.save()
                if dry:
                    transaction.set_rollback(True)
        finally:
            if client is not None:
                client.close()

        verb = 'Would change' if dry else 'Changed'
        self.stdout.write(self.style.SUCCESS(f'{verb} {changed} source(s).'))

    def _probe_nic(self, client, url):
        """
        Return True if the source's NIC home page has the "Latest Tenders" table, False if
        the site answered without one, or None if it couldn't be reached (left unclassified).
        """
        try:
            response = client.get(_nic_home(url))
        except httpx.HTTPError:
            return None
        return 'id="activeTenders"' in response.text

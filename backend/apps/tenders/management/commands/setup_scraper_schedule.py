"""
Management command to create the Celery Beat schedule for scraping, alerts and expiry.

Usage:
    python manage.py setup_scraper_schedule            # create missing entries
    python manage.py setup_scraper_schedule --reset    # also restore changed entries to these defaults
    python manage.py setup_scraper_schedule --list     # show what's scheduled

Run once per environment after `migrate` (dev, staging, production). The schedule
lives in django-celery-beat's tables (CELERY_BEAT_SCHEDULER = DatabaseScheduler),
so entries stay editable in Django admin → Periodic Tasks; without --reset this
command never overwrites an entry that already exists.
"""
from django.core.management.base import BaseCommand
from django_celery_beat.models import CrontabSchedule, PeriodicTask

# All times are IST — portals publish and close in IST, and CELERY_TIMEZONE is UTC.
TZ = 'Asia/Kolkata'

# name → (task, crontab fields, kwargs, expire_seconds, why)
SCHEDULE = {
    'Scrape tender portals (hourly)': (
        'apps.tenders.tasks.scrape_all_portals',
        {'minute': '5', 'hour': '*'},
        {'expires_seconds': 3000},
        3000,
        'NIC portals only expose their 10 newest tenders without a captcha, so frequent runs catch more.',
    ),
    'Scrape govt job sources (every 6 hours)': (
        'apps.govtjobs.tasks.scrape_all_govtjob_portals',
        {'minute': '20', 'hour': '0,6,12,18'},
        {'expires_seconds': 5 * 3600},
        5 * 3600,
        'Recruiters post a few openings a week; four runs a day is plenty.',
    ),
    'Expire stale listings (daily)': (
        'apps.tenders.tasks.expire_stale_listings',
        {'minute': '15', 'hour': '0'},
        {},
        6 * 3600,
        'Just after midnight IST, when the previous day\'s date-only deadlines (23:59:59) have passed.',
    ),
    'Match tender alerts (daily)': (
        'apps.tenders.tasks.match_tender_alerts',
        {'minute': '30', 'hour': '7'},
        {},
        6 * 3600,
        'The task matches tenders created in the last 24 hours, so running it daily avoids repeat matches.',
    ),
    'Match govt job alerts (daily)': (
        'apps.govtjobs.tasks.match_govtjob_alerts',
        {'minute': '40', 'hour': '7'},
        {},
        6 * 3600,
        'Same 24-hour window as tender alerts.',
    ),
}


class Command(BaseCommand):
    """
    `python manage.py setup_scraper_schedule` — idempotently registers the PeriodicTask rows
    Celery Beat runs: hourly tender scraping, 6-hourly govt job scraping, daily expiry and
    daily alert matching (see SCHEDULE for times and reasons).
    """
    help = 'Create (or with --reset, restore) the Celery Beat schedule for scrapers, alerts and expiry'

    def add_arguments(self, parser):
        """Register --reset and --list."""
        parser.add_argument('--reset', action='store_true', help='Overwrite existing entries with the defaults')
        parser.add_argument('--list', action='store_true', help='Only print the current schedule')

    def handle(self, *args, **options):
        """Create missing entries (or reset existing ones), then print the schedule."""
        import json

        if not options['list']:
            for name, (task, cron, kwargs, expire_seconds, why) in SCHEDULE.items():
                crontab, _ = CrontabSchedule.objects.get_or_create(
                    minute=cron['minute'], hour=cron['hour'],
                    day_of_week='*', day_of_month='*', month_of_year='*', timezone=TZ,
                )
                defaults = {
                    'task': task,
                    'crontab': crontab,
                    'interval': None,
                    'kwargs': json.dumps(kwargs),
                    # Drops the Beat message itself if no worker picks it up in time,
                    # so a long outage doesn't fire a burst of stale runs on recovery.
                    'expire_seconds': expire_seconds,
                    'enabled': True,
                    'description': why,
                }
                existing = PeriodicTask.objects.filter(name=name).first()
                if existing is None:
                    PeriodicTask.objects.create(name=name, **defaults)
                    self.stdout.write(self.style.SUCCESS(f'Created: {name}'))
                elif options['reset']:
                    for field, value in defaults.items():
                        setattr(existing, field, value)
                    existing.save()
                    self.stdout.write(self.style.WARNING(f'Reset:   {name}'))
                else:
                    self.stdout.write(f'Exists:  {name} (left as is; use --reset to restore defaults)')

        self.stdout.write('\nCurrent schedule:')
        for task in PeriodicTask.objects.select_related('crontab', 'interval').order_by('name'):
            when = f'cron "{task.crontab}"' if task.crontab else f'every {task.interval}'
            state = 'on ' if task.enabled else 'OFF'
            self.stdout.write(f'  [{state}] {task.name:42} {when:45} → {task.task}')

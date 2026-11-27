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
    # Runs 6 h then 18 h apart, so queued portal runs expire after 5 h (under the shorter gap).
    'Scrape tender portals (11:30 and 17:30)': (
        'apps.tenders.tasks.scrape_all_portals',
        {'minute': '30', 'hour': '11,17'},
        {'expires_seconds': 5 * 3600},
        5 * 3600,
        'Twice a day, late morning and evening. NIC portals only show their 10 newest tenders without a captcha, '
        'so a busy portal can publish more than 10 between runs and those are missed.',
    ),
    'Scrape govt job sources (daily 11:30)': (
        'apps.govtjobs.tasks.scrape_all_govtjob_portals',
        {'minute': '30', 'hour': '11'},
        {'expires_seconds': 20 * 3600},
        20 * 3600,
        'Recruiters post a few openings a week; once a day is enough.',
    ),
    'Fetch private company careers jobs (daily 11:30)': (
        'apps.careers.tasks.fetch_all_career_sources',
        {'minute': '30', 'hour': '11'},
        {},
        20 * 3600,
        "Private companies' own ATS feeds, once a day — fresh listings while staying polite to their sites.",
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
        {'minute': '30', 'hour': '12'},
        {},
        6 * 3600,
        'Emails each user one digest of tenders new since their alert was last checked. '
        "An hour after the 11:30 scrape, so that morning's listings go out the same day.",
    ),
    'Match job alerts (daily)': (
        'apps.alerts.tasks.match_job_alerts',
        {'minute': '50', 'hour': '12'},
        {},
        6 * 3600,
        'Emails job seekers one digest of company jobs posted since their alert was last checked.',
    ),
    'Alert on failing scrapers (daily)': (
        'apps.tenders.tasks.alert_failing_scrapers',
        {'minute': '0', 'hour': '9'},
        {},
        6 * 3600,
        'Emails SCRAPER_ALERT_EMAILS about sources whose last few runs all failed (usually a site redesign).',
    ),
    'Match govt job alerts (daily)': (
        'apps.govtjobs.tasks.match_govtjob_alerts',
        {'minute': '40', 'hour': '12'},
        {},
        6 * 3600,
        'Same digest as tender alerts, for government jobs.',
    ),
}


# Entries renamed when their times changed: old name -> current name. The command
# renames existing rows in place, so an environment set up with the old names
# doesn't keep running the old schedule next to the new one. (Run with --reset to
# apply the new times to a renamed row.)
RENAMED = {
    'Scrape tender portals (hourly)': 'Scrape tender portals (11:30 and 17:30)',
    'Scrape govt job sources (every 6 hours)': 'Scrape govt job sources (daily 11:30)',
    'Fetch private company careers jobs (twice daily)': 'Fetch private company careers jobs (daily 11:30)',
}


class Command(BaseCommand):
    """
    `python manage.py setup_scraper_schedule` — idempotently registers the PeriodicTask rows
    Celery Beat runs: tender scraping at 11:30 and 17:30 IST, govt job scraping and private-company
    careers fetching (apps.careers) daily at 11:30 IST, daily expiry and
    daily alert matching, and a daily failing-scraper alert (see SCHEDULE for times and reasons).
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
            for old, new in RENAMED.items():
                if PeriodicTask.objects.filter(name=new).exists():
                    # Both exist (e.g. created by hand): the old one would run the old times — remove it.
                    deleted, _ = PeriodicTask.objects.filter(name=old).delete()
                    if deleted:
                        self.stdout.write(self.style.WARNING(f'Removed: {old} (replaced by "{new}")'))
                elif PeriodicTask.objects.filter(name=old).update(name=new):
                    self.stdout.write(self.style.WARNING(f'Renamed: {old} -> {new}'))
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
            self.stdout.write(f'  [{state}] {task.name:42} {when:45} -> {task.task}')

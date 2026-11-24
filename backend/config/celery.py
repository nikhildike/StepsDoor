"""
Celery application for StepsDoor.

Loaded by `celery -A config worker` / `celery -A config beat` (the `config`
package re-exports `app` as `celery_app`) and imported when Django starts, so
`@shared_task` functions in `apps/*/tasks.py` — the scrapers, alert matching
and listing expiry — bind to this app and its Redis broker.

All Celery settings live in Django settings under the `CELERY_` prefix
(config/settings/base.py: broker, serializers, timezone, and
CELERY_BEAT_SCHEDULER = django-celery-beat's DatabaseScheduler, so the
schedule itself is stored in the DB — see `setup_scraper_schedule`).
"""
import os

from celery import Celery

# Same default as manage.py/wsgi.py; production sets DJANGO_SETTINGS_MODULE explicitly.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')

app = Celery('stepsdoor')
# Read every CELERY_* Django setting (CELERY_BROKER_URL → broker_url, etc.).
app.config_from_object('django.conf:settings', namespace='CELERY')
# Find tasks.py in every installed app (apps.tenders.tasks, apps.govtjobs.tasks, ...).
app.autodiscover_tasks()

# Marks `config/` as a Python package. `config` is the Django project
# package (as opposed to an "app" package under `apps/`): it holds the root
# URL conf (urls.py), the WSGI/ASGI entrypoints, the settings/ package
# with base/development/production settings modules, and the Celery app.

# Import the Celery app whenever Django starts so @shared_task functions bind
# to it (and its Redis broker) — e.g. the admin "Scrape now" action's .delay().
from .celery import app as celery_app

__all__ = ('celery_app',)

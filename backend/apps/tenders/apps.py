"""
Django app configuration for the `tenders` app.

The `tenders` app owns government tender listings scraped from public portals
(mahatenders.gov.in, eprocure.gov.in, etc.): the `Tender` model itself, saved-search
`TenderAlert`s, the `ScraperSource` portal registry, per-run `ScraperLog` records, and the
Celery tasks / management command that drive the scrape -> dedupe -> alert-match pipeline.
"""
from django.apps import AppConfig


class TendersConfig(AppConfig):
    """
    App config registered in Django's `INSTALLED_APPS` for the `tenders` app.

    Django instantiates this automatically at startup to wire up the app's models,
    admin, and signal handlers under the `tenders` label.
    """
    default_auto_field = 'django.db.models.BigAutoField'  # PK type for models in this app that don't specify one explicitly
    name = 'apps.tenders'  # dotted Python path to the app package (matches its location under backend/apps/)
    label = 'tenders'  # short app label used in INSTALLED_APPS, migrations, and DB table prefixes (e.g. tenders_tender)

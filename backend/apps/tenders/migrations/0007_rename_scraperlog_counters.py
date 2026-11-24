"""
Rename ScraperLog's tender-only counters to type-neutral names.

ScraperLog now records govt-job runs as well as tender runs (via
scrapers.pipelines.ScraperLogPipeline), so `tenders_found`/`tenders_new`
become `items_found`/`items_new`. RenameField keeps existing values.
"""
from django.db import migrations


class Migration(migrations.Migration):
    """Rename ScraperLog.tenders_found/tenders_new to items_found/items_new."""

    dependencies = [
        ('tenders', '0006_add_contractor_profile'),
    ]

    operations = [
        migrations.RenameField(
            model_name='scraperlog',
            old_name='tenders_found',
            new_name='items_found',
        ),
        migrations.RenameField(
            model_name='scraperlog',
            old_name='tenders_new',
            new_name='items_new',
        ),
    ]

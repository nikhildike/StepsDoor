"""Add `is_contractor` flag to the custom User model.

Allows contractor accounts (firms/individuals bidding on government tenders)
to be distinguished from job seekers, companies, and store owners at the
User level, enabling role-specific permission checks and API filtering.
"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('authentication', '0003_user_is_store_owner'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='is_contractor',
            field=models.BooleanField(
                default=False,
                help_text='True for contractor accounts; gets a ContractorProfile in the tenders app.',
            ),
        ),
    ]

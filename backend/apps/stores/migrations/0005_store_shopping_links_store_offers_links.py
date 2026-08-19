# Generated migration — adds shopping_links and offers_links text fields to Store.
# Both fields are blank=True so existing rows are unaffected; store owners and
# admins can paste one URL per line into each field.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('stores', '0004_store_affiliate_network'),
    ]

    operations = [
        migrations.AddField(
            model_name='store',
            name='shopping_links',
            field=models.TextField(
                blank=True,
                verbose_name='Shopping Links',
                help_text='One URL per line. Direct product/category links shown on the shopping directory.',
            ),
        ),
        migrations.AddField(
            model_name='store',
            name='offers_links',
            field=models.TextField(
                blank=True,
                verbose_name='Offers Links',
                help_text='One URL per line. Deal/sale/coupon links displayed in the Special Offers section.',
            ),
        ),
    ]

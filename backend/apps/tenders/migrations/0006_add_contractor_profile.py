"""Add ContractorProfile model to the tenders app.

Stores firm details and verification IDs for contractor accounts
(registered via the authentication app with is_contractor=True).
One ContractorProfile is created per contractor account by
RegisterSerializer.create(); linked one-to-one to the User model.
"""
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('tenders', '0005_add_reference_number'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='ContractorProfile',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('firm_name', models.CharField(max_length=255)),
                ('category', models.CharField(blank=True, max_length=100)),
                ('gem_id', models.CharField(blank=True, max_length=100)),
                ('gstin', models.CharField(blank=True, max_length=15)),
                ('pan_number', models.CharField(blank=True, max_length=10)),
                ('aadhar_number', models.CharField(blank=True, max_length=12)),
                ('contact_email', models.EmailField()),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.OneToOneField(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='contractor_profile',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'verbose_name': 'Contractor Profile',
                'verbose_name_plural': 'Contractor Profiles',
                'ordering': ['-created_at'],
            },
        ),
    ]

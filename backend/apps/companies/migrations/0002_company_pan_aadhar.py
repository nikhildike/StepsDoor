from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('companies', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='company',
            name='pan_number',
            field=models.CharField(blank=True, max_length=10, verbose_name='PAN (Company or Personal)'),
        ),
        migrations.AddField(
            model_name='company',
            name='aadhar_number',
            field=models.CharField(blank=True, max_length=12, verbose_name='Aadhar Number'),
        ),
        migrations.AlterField(
            model_name='company',
            name='gst_number',
            field=models.CharField(blank=True, max_length=15, verbose_name='GSTIN'),
        ),
    ]

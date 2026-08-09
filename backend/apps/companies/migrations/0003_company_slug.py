from django.db import migrations, models
from django.utils.text import slugify


def populate_slugs(apps, schema_editor):
    Company = apps.get_model('companies', 'Company')
    for company in Company.objects.all():
        base = slugify(company.name) or 'company'
        slug, n = base, 1
        while Company.objects.filter(slug=slug).exclude(pk=company.pk).exists():
            slug = f"{base}-{n}"
            n += 1
        company.slug = slug
        company.save(update_fields=['slug'])


class Migration(migrations.Migration):

    dependencies = [
        ('companies', '0002_company_pan_aadhar'),
    ]

    operations = [
        migrations.AddField(
            model_name='company',
            name='slug',
            field=models.SlugField(blank=True, max_length=120, default=''),
            preserve_default=False,
        ),
        migrations.RunPython(populate_slugs, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='company',
            name='slug',
            field=models.SlugField(max_length=120, unique=True),
        ),
    ]

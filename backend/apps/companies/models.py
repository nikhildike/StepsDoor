from django.db import models
from django.utils.text import slugify


class Company(models.Model):
    user = models.OneToOneField(
        'authentication.User',
        on_delete=models.CASCADE,
        related_name='company',
    )
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=120, unique=True, blank=True)
    logo = models.ImageField(upload_to='logos/', blank=True, null=True)
    # Verification IDs — at least one required at registration
    gst_number = models.CharField(max_length=15, blank=True, verbose_name='GSTIN')
    pan_number = models.CharField(max_length=10, blank=True, verbose_name='PAN (Company or Personal)')
    aadhar_number = models.CharField(max_length=12, blank=True, verbose_name='Aadhar Number')
    contact_email = models.EmailField()
    contact_phone = models.CharField(max_length=15, blank=True)
    website = models.URLField(blank=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Company'
        verbose_name_plural = 'Companies'

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.name) or 'company'
            slug, n = base, 1
            while Company.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base}-{n}"
                n += 1
            self.slug = slug
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name

from django.db import models
from django.utils.text import slugify

STORE_CATEGORIES = [
    ('marketplaces',  'General Marketplaces'),
    ('fashion',       'Fashion & Apparel'),
    ('footwear',      'Footwear'),
    ('electronics',   'Electronics & Mobiles'),
    ('grocery',       'Grocery & Quick Commerce'),
    ('beauty',        'Beauty & Personal Care'),
    ('pharmacy',      'Pharmacy & Health'),
    ('home',          'Home, Furniture & Decor'),
    ('jewellery',     'Jewellery'),
    ('books',         'Books & Stationery'),
    ('baby',          'Baby & Kids'),
    ('sports',        'Sports & Fitness'),
    ('eyewear',       'Eyewear & Watches'),
    ('refurbished',   'Refurbished & Second-Hand'),
    ('bags',          'Bags & Luggage'),
    ('global',        'Global (Ships to India)'),
    ('other',         'Other'),
]

RETAIL_CATEGORIES = [
    ('supermarkets',  'Supermarkets & Grocery'),
    ('department',    'Department & Apparel'),
    ('electronics',   'Electronics & Appliances'),
    ('jewellery',     'Jewellery'),
    ('pharmacy',      'Pharmacy & Health'),
    ('beauty',        'Beauty & Personal Care'),
    ('footwear',      'Footwear'),
    ('sports',        'Sports & Fitness'),
    ('home',          'Home & Furniture'),
    ('books',         'Books & Stationery'),
    ('food',          'Food & QSR Chains'),
    ('auto',          'Auto & Accessories'),
    ('other',         'Other'),
]

STORE_TYPE_CHOICES = [
    ('online', 'Online Store'),
    ('retail', 'Retail Chain'),
]


class Store(models.Model):
    user = models.OneToOneField(
        'authentication.User',
        on_delete=models.CASCADE,
        related_name='store',
    )
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=120, unique=True, blank=True)
    logo = models.ImageField(upload_to='store_logos/', blank=True, null=True)
    store_type = models.CharField(max_length=10, choices=STORE_TYPE_CHOICES, default='online')
    category = models.CharField(max_length=50, default='other')
    website_url = models.URLField()
    store_locator_url = models.URLField(blank=True)
    description = models.TextField(blank=True)
    tagline = models.CharField(max_length=255, blank=True)

    # Verification IDs — at least one required at registration
    gst_number    = models.CharField(max_length=15, blank=True, verbose_name='GSTIN')
    pan_number    = models.CharField(max_length=10, blank=True)
    aadhar_number = models.CharField(max_length=12, blank=True)

    contact_email = models.EmailField()
    contact_phone = models.CharField(max_length=15, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Store'
        verbose_name_plural = 'Stores'
        ordering = ['name']

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.name) or 'store'
            slug, n = base, 1
            while Store.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base}-{n}"
                n += 1
            self.slug = slug
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name

    @property
    def has_active_subscription(self):
        from apps.subscriptions.models import Subscription
        from django.utils import timezone
        from django.db.models import Q
        return Subscription.objects.filter(
            Q(user=self.user) | Q(company__user=self.user),
            status='active',
            end_date__gt=timezone.now(),
        ).exists()

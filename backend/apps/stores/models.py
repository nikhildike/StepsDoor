"""Models for the `stores` app.

A "store" is a company storefront/catalogue listing shown on the public
shopping pages (online stores and retail chains) as a companion feature to
job postings. Store owners register a Store, subscribe to a plan (see
`apps.subscriptions`), and — once their subscription is active — appear in
the public listings so job seekers can click through to shop, generating
affiliate revenue for StepsDoor.
"""
from django.db import models
from django.utils.text import slugify

# Dropdown choices for `Store.category` when `store_type == 'online'`.
# Values (left) are stored in the DB; labels (right) are shown in forms/admin.
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

# Dropdown choices for `Store.category` when `store_type == 'retail'`.
# Kept separate from STORE_CATEGORIES since retail chains use different groupings
# (e.g. "Food & QSR Chains", "Auto & Accessories") than pure online marketplaces.
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

# Top-level choices for `Store.store_type` — determines which category list
# (STORE_CATEGORIES vs RETAIL_CATEGORIES) applies and which public endpoint
# (PublicStoreListView vs PublicRetailStoreListView) the store shows up in.
STORE_TYPE_CHOICES = [
    ('online', 'Online Store'),
    ('retail', 'Retail Chain'),
]


class Store(models.Model):
    """A company storefront/catalogue listing shown on the public shopping pages.

    Created by a store-owner user (a `User` with `is_store_owner=True`) via
    the "My Store" registration/edit flow. Only appears in public listings
    once `is_active` is True and the owning user has a live subscription
    (see `has_active_subscription` below and `apps.subscriptions.Subscription`).
    """
    # One store per user account; store owners manage exactly one storefront.
    user = models.OneToOneField(
        'authentication.User',
        on_delete=models.CASCADE,  # deleting the user account removes their store too
        related_name='store',  # access via `user.store`
    )
    name = models.CharField(max_length=255)  # store/brand display name
    # URL-safe identifier used in public store links; auto-generated from `name`
    # in save() if not supplied, so it's blank-able on the form but always unique.
    slug = models.SlugField(max_length=120, unique=True, blank=True)
    logo = models.ImageField(upload_to='store_logos/', blank=True, null=True)  # store branding image, optional
    # Whether this is a pure e-commerce site ('online') or a brick-and-mortar
    # chain with a store locator ('retail'); drives which category list/UI applies.
    store_type = models.CharField(max_length=10, choices=STORE_TYPE_CHOICES, default='online')
    # Free-form category code; validated against STORE_CATEGORIES or RETAIL_CATEGORIES
    # in the serializer/UI depending on store_type (no DB-level choices constraint here
    # since the valid set differs by store_type).
    category = models.CharField(max_length=50, default='other')
    website_url = models.URLField()  # the store's own site; default click-through target
    store_locator_url = models.URLField(blank=True)  # optional "find a store near you" link, mainly for retail chains
    # Affiliate link set by admin — e.g. an EarnKaro or custom network converted URL.
    # When set, the click-tracking endpoint returns this instead of website_url.
    affiliate_url = models.URLField(
        blank=True,
        verbose_name='Affiliate URL',
        help_text='Pre-converted affiliate link (EarnKaro, etc.). Overrides automatic Amazon tag injection.',
    )
    # Which affiliate program this store's revenue is tracked through.
    AFFILIATE_NETWORK_CHOICES = [
        ('amazon',   'Amazon Associates'),
        ('cuelinks', 'Cuelinks'),
        ('earnkaro', 'EarnKaro'),
        ('direct',   'Direct (no affiliate)'),
    ]
    affiliate_network = models.CharField(
        max_length=20,
        choices=AFFILIATE_NETWORK_CHOICES,
        blank=True,  # optional — not every store has a tracked affiliate network
        verbose_name='Affiliate Network',
        help_text='Which affiliate network this store earns through. Shown as a badge on the shopping page.',
    )
    description = models.TextField(blank=True)  # longer free-text about the store, shown on its detail view
    tagline = models.CharField(max_length=255, blank=True)  # short marketing blurb shown alongside the store card

    # Paste one URL per line. Admin/store-owner can bulk-paste links here.
    # shopping_links: direct product/category links shown on the shopping directory
    # (e.g. a brand's "Shoes" section URL or a seasonal collection page).
    shopping_links = models.TextField(
        blank=True,
        verbose_name='Shopping Links',
        help_text='One URL per line. Direct product/category links shown on the shopping directory.',
    )
    # offers_links: curated deal/offer URLs shown in the "Special Offers" strip on
    # the Shopping page — intended for time-limited promotions, sale pages, coupon
    # landing pages, etc.
    offers_links = models.TextField(
        blank=True,
        verbose_name='Offers Links',
        help_text='One URL per line. Deal/sale/coupon links displayed in the Special Offers section.',
    )

    # Verification IDs — at least one required at registration
    gst_number    = models.CharField(max_length=15, blank=True, verbose_name='GSTIN')  # GST registration number
    pan_number    = models.CharField(max_length=10, blank=True)  # PAN card number
    aadhar_number = models.CharField(max_length=12, blank=True)  # Aadhar number (individual proprietors)

    contact_email = models.EmailField()  # store owner's contact email, required
    contact_phone = models.CharField(max_length=15, blank=True)  # optional contact phone number
    # Admin-controlled visibility switch, independent of subscription status —
    # lets staff hide a store (e.g. for policy violations) without deleting it.
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)  # set once on creation
    updated_at = models.DateTimeField(auto_now=True)  # refreshed on every save

    class Meta:
        verbose_name = 'Store'
        verbose_name_plural = 'Stores'
        ordering = ['name']  # alphabetical by default, e.g. for admin listing and public browse

    def save(self, *args, **kwargs):
        """Auto-generate a unique slug from `name` on first save, then delegate to the default save.

        Called implicitly whenever a Store is created/updated (e.g. from the
        store registration API or Django admin). Only runs the slug generation
        when `slug` is blank, so it never overwrites a slug once assigned.
        """
        if not self.slug:
            base = slugify(self.name) or 'store'
            slug, n = base, 1
            # Loop to avoid unique constraint violations when multiple stores
            # share the same name (appends -1, -2, ... until unique).
            while Store.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base}-{n}"
                n += 1
            self.slug = slug
        super().save(*args, **kwargs)

    def __str__(self):
        """Return the store name — used in Django admin dropdowns/list views and shell repr."""
        return self.name

    @property
    def has_active_subscription(self):
        """Whether this store's owner currently has a live (paid, unexpired) subscription.

        Used to gate visibility in the public store listings (see
        `_subscribed_store_qs` in views.py) and exposed read-only on
        `StoreSerializer` so the frontend can show subscription-gated UI.
        Checks both `Subscription.user` (direct store-owner subscriptions)
        and `Subscription.company.user` (in case a company account also
        owns a store) since either FK can represent "this user".
        """
        from apps.subscriptions.models import Subscription
        from django.utils import timezone
        from django.db.models import Q
        return Subscription.objects.filter(
            Q(user=self.user) | Q(company__user=self.user),
            status='active',
            end_date__gt=timezone.now(),
        ).exists()

"""Models for the `services` app.

A "service provider" is a local service business (lawyer, plumber,
electrician, mechanic, etc.) shown on the public Services directory — the
mobile app's replacement for the old standalone Retail tab (retail store
browsing was merged into the Shopping tab; see CLAUDE.md and
`AppNavigator` in the mobile app). Unlike `Store`/`Company`, there is no
self-service owner registration flow here yet: entries are added and
maintained by StepsDoor staff via Django admin, the same way `Tender`/
`GovtJob` rows are curated rather than user-submitted.
"""
from django.db import models

# Dropdown choices for `ServiceProvider.category`. Values (left) are stored
# in the DB and used for `?category=` filtering; labels (right) are shown
# in Django admin and returned as `category_display` by the serializer.
SERVICE_CATEGORIES = [
    ('lawyer',            'Lawyer'),
    ('plumber',           'Plumber'),
    ('electrician',       'Electrician'),
    ('mechanic',          'Mechanic'),
    ('carpenter',         'Carpenter'),
    ('painter',           'Painter'),
    ('pest_control',      'Pest Control'),
    ('appliance_repair',  'Appliance Repair'),
    ('ac_repair',         'AC & Refrigeration Repair'),
    ('computer_repair',   'Computer & Mobile Repair'),
    ('salon_beauty',      'Salon & Beauty'),
    ('tutor',             'Tutor / Coaching'),
    ('caterer',           'Caterer'),
    ('photographer',      'Photographer'),
    ('cleaning',          'Home Cleaning'),
    ('tailor',            'Tailor'),
    ('packers_movers',    'Packers & Movers'),
    ('event_planner',     'Event Planner'),
    ('other',             'Other'),
]


class ServiceProvider(models.Model):
    """A local service provider listed on the public Services directory.

    Curated via Django admin (`/admin/services/serviceprovider/`) — there is
    no owner self-service flow yet. Only rows with `is_active=True` appear
    in the public list (see `PublicServiceProviderListView` in views.py).
    """
    name = models.CharField(max_length=255)  # provider's business/display name, e.g. "Sharma Plumbing Works"
    # Free-form service category; drives the mobile app's category filter chips/modal.
    category = models.CharField(max_length=30, choices=SERVICE_CATEGORIES, default='other')
    description = models.TextField(blank=True)  # short free-text about the services offered

    # Location — a free-text address plus city/state/pincode for filtering.
    # Deliberately not geocoded (no lat/lng) since there's no maps
    # integration yet; the app shows the address as plain text.
    address = models.TextField(help_text='Full street address / shop location.')
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100, blank=True)
    pincode = models.CharField(max_length=10, blank=True)

    phone = models.CharField(max_length=15)  # primary contact number — tappable to call in the app
    whatsapp = models.CharField(max_length=15, blank=True)  # optional WhatsApp number — tappable to chat
    email = models.EmailField(blank=True)

    photo = models.ImageField(upload_to='service_photos/', blank=True, null=True)  # optional shopfront/profile photo

    is_active = models.BooleanField(default=True)  # admin visibility toggle — hide without deleting
    created_at = models.DateTimeField(auto_now_add=True)  # set once on creation
    updated_at = models.DateTimeField(auto_now=True)  # refreshed on every save

    class Meta:
        verbose_name = 'Service Provider'
        verbose_name_plural = 'Service Providers'
        ordering = ['-created_at']  # newest listings first

    def __str__(self):
        """Return "name (category)" — used in Django admin list views and shell repr."""
        return f"{self.name} ({self.get_category_display()})"

"""Models for the `companies` app.

Defines `Company`, the profile record that backs a company-role `User`
(`is_company=True`): the org's public identity (name, slug, logo, career
page), verification IDs collected at registration, and contact details.
Created during registration by
`apps.authentication.serializers.RegisterSerializer.create()` (directly for
company signups, and alongside a `Store` for store-owner signups), and
managed thereafter via `apps.companies.views.CompanyViewSet`.
"""
from django.db import models
from django.utils.text import slugify


class Company(models.Model):
    """A company's public profile — one per company-role user.

    Powers the company dashboard (`CompanyViewSet.me`), the public company
    directory (`CompanyPublicListView`), and the public career page
    (`CompanyCareersView`, `/api/companies/<slug>/careers/`) where job
    seekers view all of the company's active job posts.
    """
    user = models.OneToOneField(
        'authentication.User',
        on_delete=models.CASCADE,  # Deleting the account deletes its Company profile too — a Company can't outlive its owning User
        related_name='company',  # Enables `request.user.company` lookups (used throughout views.py)
    )
    name = models.CharField(max_length=255)  # Display name shown on the career page, job listings, and public directory
    slug = models.SlugField(max_length=120, unique=True, blank=True)  # URL-safe identifier for the public career page (/api/companies/<slug>/careers/); auto-derived from name in save() when blank, so blank=True is allowed on the field even though it's always populated before saving
    logo = models.ImageField(upload_to='logos/', blank=True, null=True)  # Optional company logo file; null=True since ImageField has no meaningful "empty" value besides NULL when unset
    # Verification IDs — at least one required at registration
    gst_number = models.CharField(max_length=15, blank=True, verbose_name='GSTIN')  # Indian GST registration number; one of three acceptable proof-of-business IDs (see RegisterSerializer.validate)
    pan_number = models.CharField(max_length=10, blank=True, verbose_name='PAN (Company or Personal)')  # Indian PAN (tax ID), company's or the signing individual's; alternate verification ID
    aadhar_number = models.CharField(max_length=12, blank=True, verbose_name='Aadhar Number')  # Indian Aadhar (personal ID) number; alternate verification ID, mainly for sole proprietors/individual store owners
    contact_email = models.EmailField()  # Business contact email, defaults to the owning user's email at creation but editable separately thereafter
    contact_phone = models.CharField(max_length=15, blank=True)  # Optional business contact number
    website = models.URLField(blank=True)  # Optional link to the company's own site/careers page
    description = models.TextField(blank=True)  # Optional free-text "about us" shown on the public company profile
    created_at = models.DateTimeField(auto_now_add=True)  # Profile creation timestamp, set once automatically on first save

    class Meta:
        verbose_name = 'Company'
        verbose_name_plural = 'Companies'  # Overrides Django's default "Companys" pluralization for the admin UI

    def save(self, *args, **kwargs):
        """Auto-generate a unique slug from `name` on first save, before delegating to the normal save.

        Called implicitly by Django on every `Company.save()` (including
        `Company.objects.create(...)` in `RegisterSerializer.create()`), so
        callers never need to set `slug` themselves.
        """
        if not self.slug:
            base = slugify(self.name) or 'company'
            slug, n = base, 1
            # Loop appends -1, -2, ... until a free slug is found; exclude(pk=self.pk) so
            # re-saving an existing company without changing its name doesn't collide with itself
            while Company.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base}-{n}"
                n += 1
            self.slug = slug
        super().save(*args, **kwargs)

    def __str__(self):
        """Human-readable label used in Django admin and shell/debug output."""
        return self.name

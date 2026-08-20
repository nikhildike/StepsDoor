"""
Models for the `freelancers` app.

This module defines the data model for the early-stage freelancer marketplace
feature: freelancers create a `FreelancerProfile` (rates, skills, availability,
location, portfolio links) that is browsable/searchable by anyone looking to
hire, and hirers can leave a `FreelancerReview` for a freelancer they've worked
with. Ratings shown on a profile are derived (averaged) from its reviews.
"""
from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator


class FreelancerCategory(models.TextChoices):
    """Enumerates the service categories a freelancer profile can be tagged with.

    Used as the `choices` for `FreelancerProfile.category` so listings can be
    filtered/faceted by category (e.g. "Web Development", "Design & Creative").
    """
    WEB_DEV    = 'web_dev',    'Web Development'
    MOBILE     = 'mobile',     'Mobile Apps'
    DESIGN     = 'design',     'Design & Creative'
    WRITING    = 'writing',    'Content Writing'
    DATA       = 'data',       'Data & Analytics'
    IT_NETWORK = 'it_network', 'IT & Networking'
    MARKETING  = 'marketing',  'Digital Marketing'
    LEGAL      = 'legal',      'Legal & Finance'
    OTHER      = 'other',      'Other'


class AvailabilityStatus(models.TextChoices):
    """Enumerates whether a freelancer is currently taking on new work.

    Used as the `choices` for `FreelancerProfile.availability` so hirers can
    filter for freelancers who are actually available right now.
    """
    AVAILABLE     = 'available',     'Available'
    BUSY          = 'busy',          'Busy'
    NOT_AVAILABLE = 'not_available', 'Not Available'


class FreelancerProfile(models.Model):
    """A freelancer's public profile: professional info, rates, and links.

    Created/edited by a job seeker who wants to offer freelance services (via
    `FreelancerProfileViewSet.me`), and browsed/searched by anyone (companies
    or other users) looking to hire freelance help. One profile per user
    (enforced by the `OneToOneField` below).
    """
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        # One freelancer profile per user; lets User.freelancer_profile look this up directly
        related_name='freelancer_profile',
    )

    # Professional info
    headline = models.CharField(max_length=255, help_text="e.g. Full Stack Developer")  # Short professional title shown in listings
    bio = models.TextField(blank=True)  # Longer free-text self-description; optional
    category = models.CharField(
        max_length=30, choices=FreelancerCategory.choices, default=FreelancerCategory.OTHER,
        db_index=True,  # Indexed since listings are commonly filtered by category
    )
    skills = models.JSONField(default=list, help_text="List of skill strings e.g. ['React', 'Node.js']")  # Freeform skill tags, stored as a JSON array rather than a separate model
    years_of_experience = models.PositiveSmallIntegerField(default=0)  # Whole years of experience; must be non-negative

    # Rates & availability
    hourly_rate = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True,
        help_text="Rate in INR per hour")  # Nullable: freelancer may prefer not to disclose a rate
    availability = models.CharField(
        max_length=20, choices=AvailabilityStatus.choices, default=AvailabilityStatus.AVAILABLE,
        db_index=True,  # Indexed since listings are commonly filtered by availability
    )

    # Location
    city = models.CharField(max_length=100, blank=True)  # Free-text city; optional
    state = models.CharField(max_length=100, blank=True, db_index=True)  # Indexed for the `states` facet endpoint and location filtering

    # Media & links
    profile_photo = models.ImageField(upload_to='freelancers/photos/', null=True, blank=True)  # Optional avatar/photo, stored under freelancers/photos/
    portfolio_url = models.URLField(blank=True)  # Optional link to a portfolio site
    linkedin_url  = models.URLField(blank=True)  # Optional LinkedIn profile link
    github_url    = models.URLField(blank=True)  # Optional GitHub profile link

    # Status
    is_active   = models.BooleanField(default=True, db_index=True)  # Soft toggle to hide a profile from public listings without deleting it; indexed since it's used in every public queryset filter
    is_verified = models.BooleanField(default=False)  # Set by staff/admin to mark a profile as verified/trustworthy; not user-editable via the API (read-only in serializers)

    created_at = models.DateTimeField(auto_now_add=True)  # Set once when the profile is first created
    updated_at = models.DateTimeField(auto_now=True)  # Refreshed automatically on every save

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Freelancer Profile'
        verbose_name_plural = 'Freelancer Profiles'

    def __str__(self):
        """Human-readable representation used in the admin and shell, e.g. "user — headline"."""
        return f"{self.user} — {self.headline}"

    @property
    def average_rating(self):
        """Compute the mean of all review ratings for this profile, rounded to 1 decimal.

        Returns None if the profile has no reviews yet. Used by the API
        serializers to expose a derived rating without storing a redundant column.
        """
        agg = self.reviews.aggregate(avg=models.Avg('rating'))
        return round(agg['avg'], 1) if agg['avg'] else None

    @property
    def review_count(self):
        """Return the number of reviews this profile has received."""
        return self.reviews.count()


class FreelancerReview(models.Model):
    """A single rating + comment left by one user for one freelancer profile.

    Created via `FreelancerProfileViewSet.add_review` when a hirer rates a
    freelancer they've worked with; the (freelancer, reviewer) unique
    constraint means a re-submission updates the existing review instead of
    creating a duplicate (see `update_or_create` in the view).
    """
    freelancer = models.ForeignKey(
        FreelancerProfile, on_delete=models.CASCADE, related_name='reviews',
        # related_name lets FreelancerProfile.reviews power average_rating/review_count above
    )
    reviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='given_reviews',
        # related_name lets User.given_reviews list reviews a user has written
    )
    rating = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],  # Enforce a 1-5 star rating scale
    )
    comment = models.TextField(blank=True)  # Optional free-text review comment
    created_at = models.DateTimeField(auto_now_add=True)  # Set once when the review is first created

    class Meta:
        unique_together = ('freelancer', 'reviewer')  # One review per (freelancer, reviewer) pair — re-reviewing updates rather than duplicates
        ordering = ['-created_at']
        verbose_name = 'Freelancer Review'

    def __str__(self):
        """Human-readable representation, e.g. "reviewer → freelancer (4★)"."""
        return f"{self.reviewer} → {self.freelancer} ({self.rating}★)"

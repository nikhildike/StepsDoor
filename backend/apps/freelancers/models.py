from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator


class FreelancerCategory(models.TextChoices):
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
    AVAILABLE     = 'available',     'Available'
    BUSY          = 'busy',          'Busy'
    NOT_AVAILABLE = 'not_available', 'Not Available'


class FreelancerProfile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='freelancer_profile',
    )

    # Professional info
    headline = models.CharField(max_length=255, help_text="e.g. Full Stack Developer")
    bio = models.TextField(blank=True)
    category = models.CharField(
        max_length=30, choices=FreelancerCategory.choices, default=FreelancerCategory.OTHER,
        db_index=True,
    )
    skills = models.JSONField(default=list, help_text="List of skill strings e.g. ['React', 'Node.js']")
    years_of_experience = models.PositiveSmallIntegerField(default=0)

    # Rates & availability
    hourly_rate = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True,
        help_text="Rate in INR per hour")
    availability = models.CharField(
        max_length=20, choices=AvailabilityStatus.choices, default=AvailabilityStatus.AVAILABLE,
        db_index=True,
    )

    # Location
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True, db_index=True)

    # Media & links
    profile_photo = models.ImageField(upload_to='freelancers/photos/', null=True, blank=True)
    portfolio_url = models.URLField(blank=True)
    linkedin_url  = models.URLField(blank=True)
    github_url    = models.URLField(blank=True)

    # Status
    is_active   = models.BooleanField(default=True, db_index=True)
    is_verified = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Freelancer Profile'
        verbose_name_plural = 'Freelancer Profiles'

    def __str__(self):
        return f"{self.user} — {self.headline}"

    @property
    def average_rating(self):
        agg = self.reviews.aggregate(avg=models.Avg('rating'))
        return round(agg['avg'], 1) if agg['avg'] else None

    @property
    def review_count(self):
        return self.reviews.count()


class FreelancerReview(models.Model):
    freelancer = models.ForeignKey(
        FreelancerProfile, on_delete=models.CASCADE, related_name='reviews',
    )
    reviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='given_reviews',
    )
    rating = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
    )
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('freelancer', 'reviewer')
        ordering = ['-created_at']
        verbose_name = 'Freelancer Review'

    def __str__(self):
        return f"{self.reviewer} → {self.freelancer} ({self.rating}★)"

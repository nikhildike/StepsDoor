"""
Django admin registration for the `freelancers` app.

Lets staff browse/manage freelancer profiles and their reviews from the
Django admin site (`/admin/`) — e.g. to verify a profile, deactivate a bad
listing, or moderate reviews.
"""
from django.contrib import admin
from .models import FreelancerProfile, FreelancerReview


class FreelancerReviewInline(admin.TabularInline):
    """Read-only inline showing a freelancer's reviews on their profile admin page.

    Lets staff see review history in context while editing a
    FreelancerProfile, without being able to edit/delete reviews from there
    (reviews are moderated via `FreelancerReviewAdmin` directly instead).
    """
    model = FreelancerReview
    extra = 0
    readonly_fields = ['reviewer', 'rating', 'comment', 'created_at']
    can_delete = False


@admin.register(FreelancerProfile)
class FreelancerProfileAdmin(admin.ModelAdmin):
    """Admin interface for managing freelancer profiles.

    Used by staff to verify profiles (`is_verified`), deactivate listings
    (`is_active`), and review a freelancer's info and stats in one place.
    """
    # Columns shown in the profile list view for quick scanning/triage
    list_display  = ['user', 'headline', 'category', 'city', 'state', 'hourly_rate',
                      'availability', 'is_verified', 'is_active', 'created_at']
    # Sidebar filters matching the fields hirers/admins most commonly narrow by
    list_filter   = ['category', 'availability', 'state', 'is_verified', 'is_active']
    # Fields searchable from the admin search box, including related User fields
    search_fields = ['user__email', 'user__first_name', 'user__last_name', 'headline', 'city']
    readonly_fields = ['created_at', 'updated_at', 'average_rating', 'review_count']
    inlines       = [FreelancerReviewInline]

    fieldsets = (
        ('User', {'fields': ('user',)}),
        ('Professional', {'fields': ('headline', 'bio', 'category', 'skills', 'years_of_experience')}),
        ('Rates & Availability', {'fields': ('hourly_rate', 'availability')}),
        ('Location', {'fields': ('city', 'state')}),
        ('Links', {'fields': ('profile_photo', 'portfolio_url', 'linkedin_url', 'github_url')}),
        ('Status', {'fields': ('is_active', 'is_verified')}),
        ('Stats', {'fields': ('average_rating', 'review_count', 'created_at', 'updated_at')}),
    )


@admin.register(FreelancerReview)
class FreelancerReviewAdmin(admin.ModelAdmin):
    """Admin interface for moderating freelancer reviews.

    Used by staff to spot-check or remove inappropriate/fraudulent reviews.
    """
    list_display  = ['freelancer', 'reviewer', 'rating', 'created_at']
    list_filter   = ['rating']  # Filter by star rating to quickly find, e.g., all 1-star reviews for moderation
    search_fields = ['freelancer__user__email', 'reviewer__email', 'comment']
    readonly_fields = ['created_at']

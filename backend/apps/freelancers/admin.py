from django.contrib import admin
from .models import FreelancerProfile, FreelancerReview


class FreelancerReviewInline(admin.TabularInline):
    model = FreelancerReview
    extra = 0
    readonly_fields = ['reviewer', 'rating', 'comment', 'created_at']
    can_delete = False


@admin.register(FreelancerProfile)
class FreelancerProfileAdmin(admin.ModelAdmin):
    list_display  = ['user', 'headline', 'category', 'city', 'state', 'hourly_rate',
                      'availability', 'is_verified', 'is_active', 'created_at']
    list_filter   = ['category', 'availability', 'state', 'is_verified', 'is_active']
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
    list_display  = ['freelancer', 'reviewer', 'rating', 'created_at']
    list_filter   = ['rating']
    search_fields = ['freelancer__user__email', 'reviewer__email', 'comment']
    readonly_fields = ['created_at']

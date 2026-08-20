"""
Serializers for the `freelancers` app.

Converts `FreelancerProfile` and `FreelancerReview` model instances to/from
JSON for the REST API in `views.py`: a compact list serializer for browsing,
a full detail serializer for a single profile (including its reviews), and a
review serializer used both for embedding reviews in a profile and for
submitting a new review.
"""
from rest_framework import serializers
from .models import FreelancerProfile, FreelancerReview


class FreelancerReviewSerializer(serializers.ModelSerializer):
    """Serializes a single `FreelancerReview`.

    Used both to embed a freelancer's reviews inside `FreelancerDetailSerializer`
    and standalone when a hirer submits a new review via
    `FreelancerProfileViewSet.add_review`.
    """
    reviewer_name = serializers.CharField(source='reviewer.get_full_name', read_only=True)  # Derived display name of the reviewer, not stored on the model

    class Meta:
        model = FreelancerReview
        fields = ['id', 'reviewer_name', 'rating', 'comment', 'created_at']
        read_only_fields = ['id', 'reviewer_name', 'created_at']


class FreelancerListSerializer(serializers.ModelSerializer):
    """Compact serializer for listing pages."""
    average_rating = serializers.FloatField(read_only=True)  # Derived from FreelancerProfile.average_rating property
    review_count   = serializers.IntegerField(read_only=True)  # Derived from FreelancerProfile.review_count property
    profile_photo  = serializers.ImageField(read_only=True)  # Not editable via the list serializer; profile photo is uploaded through other flows

    class Meta:
        model = FreelancerProfile
        fields = [
            'id', 'headline', 'category', 'skills', 'hourly_rate',
            'availability', 'city', 'state', 'profile_photo',
            'years_of_experience', 'is_verified',
            'average_rating', 'review_count',
        ]


class FreelancerDetailSerializer(serializers.ModelSerializer):
    """Full serializer for detail / profile pages."""
    average_rating = serializers.FloatField(read_only=True)  # Derived from FreelancerProfile.average_rating property
    review_count   = serializers.IntegerField(read_only=True)  # Derived from FreelancerProfile.review_count property
    reviews        = FreelancerReviewSerializer(many=True, read_only=True)  # Nested list of all reviews for this profile
    profile_photo  = serializers.ImageField(read_only=True)  # Read-only here; photo upload is handled elsewhere
    owner_name     = serializers.CharField(source='user.get_full_name', read_only=True)  # Derived display name of the profile's owning user

    class Meta:
        model = FreelancerProfile
        fields = [
            'id', 'owner_name', 'headline', 'bio', 'category', 'skills',
            'hourly_rate', 'availability', 'city', 'state', 'profile_photo',
            'portfolio_url', 'linkedin_url', 'github_url',
            'years_of_experience', 'is_verified', 'is_active',
            'average_rating', 'review_count', 'reviews',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'is_verified', 'created_at', 'updated_at']

from rest_framework import serializers
from .models import FreelancerProfile, FreelancerReview


class FreelancerReviewSerializer(serializers.ModelSerializer):
    reviewer_name = serializers.CharField(source='reviewer.get_full_name', read_only=True)

    class Meta:
        model = FreelancerReview
        fields = ['id', 'reviewer_name', 'rating', 'comment', 'created_at']
        read_only_fields = ['id', 'reviewer_name', 'created_at']


class FreelancerListSerializer(serializers.ModelSerializer):
    """Compact serializer for listing pages."""
    average_rating = serializers.FloatField(read_only=True)
    review_count   = serializers.IntegerField(read_only=True)
    profile_photo  = serializers.ImageField(read_only=True)

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
    average_rating = serializers.FloatField(read_only=True)
    review_count   = serializers.IntegerField(read_only=True)
    reviews        = FreelancerReviewSerializer(many=True, read_only=True)
    profile_photo  = serializers.ImageField(read_only=True)
    owner_name     = serializers.CharField(source='user.get_full_name', read_only=True)

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

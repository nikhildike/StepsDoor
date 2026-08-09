from rest_framework import serializers

from .models import Company


class CompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = '__all__'
        read_only_fields = ['id', 'slug', 'created_at', 'user']


class CompanyPublicSerializer(serializers.ModelSerializer):
    active_job_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Company
        fields = ['id', 'name', 'slug', 'logo', 'description', 'website', 'active_job_count']

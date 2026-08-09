from rest_framework import serializers

from .models import JobAlert


class JobAlertSerializer(serializers.ModelSerializer):
    class Meta:
        model = JobAlert
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'job_seeker']

from rest_framework import serializers

from .models import JobClick


class JobClickSerializer(serializers.ModelSerializer):
    class Meta:
        model = JobClick
        fields = '__all__'
        read_only_fields = ['id', 'clicked_at']

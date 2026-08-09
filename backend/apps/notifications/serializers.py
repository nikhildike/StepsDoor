from rest_framework import serializers

from .models import FCMToken


class FCMTokenSerializer(serializers.ModelSerializer):
    class Meta:
        model = FCMToken
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'user']

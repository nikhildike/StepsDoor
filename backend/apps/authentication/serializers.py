import uuid
from django.contrib.auth import get_user_model
from django.core import signing
from django.db import transaction
from rest_framework import serializers

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name',
                  'phone', 'is_company', 'is_job_seeker', 'is_store_owner', 'created_at']
        read_only_fields = ['id', 'created_at']


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    email_verified_token = serializers.CharField(write_only=True)

    # Company-only fields
    company_name = serializers.CharField(required=False, allow_blank=True, write_only=True)
    gstin = serializers.CharField(required=False, allow_blank=True, write_only=True, max_length=15)
    pan_number = serializers.CharField(required=False, allow_blank=True, write_only=True, max_length=10)
    aadhar_number = serializers.CharField(required=False, allow_blank=True, write_only=True, max_length=12)

    # Store-owner-only fields
    store_name = serializers.CharField(required=False, allow_blank=True, write_only=True)
    store_type = serializers.CharField(required=False, allow_blank=True, write_only=True)   # 'online' | 'retail'
    store_category = serializers.CharField(required=False, allow_blank=True, write_only=True)
    store_url = serializers.URLField(required=False, allow_blank=True, write_only=True)
    store_locator_url = serializers.URLField(required=False, allow_blank=True, write_only=True)

    class Meta:
        model = User
        fields = [
            'email', 'password', 'email_verified_token',
            'first_name', 'last_name', 'phone',
            'is_company', 'is_job_seeker', 'is_store_owner',
            'company_name', 'gstin', 'pan_number', 'aadhar_number',
            'store_name', 'store_type', 'store_category', 'store_url', 'store_locator_url',
        ]

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('An account with this email already exists.')
        return value.lower()

    def validate(self, attrs):
        # Verify the signed token matches the submitted email
        token = attrs.pop('email_verified_token', '')
        try:
            payload = signing.loads(token, salt='linksdoor-email-verified', max_age=3600)
        except signing.SignatureExpired:
            raise serializers.ValidationError({'email': 'Email verification has expired. Please verify again.'})
        except signing.BadSignature:
            raise serializers.ValidationError({'email': 'Invalid email verification token.'})

        if payload.get('email') != attrs.get('email', '').lower():
            raise serializers.ValidationError({'email': 'Verified email does not match the submitted email.'})

        if attrs.get('is_company'):
            if not attrs.get('company_name', '').strip():
                raise serializers.ValidationError({'company_name': 'Company name is required.'})
            if not any([attrs.get('gstin'), attrs.get('pan_number'), attrs.get('aadhar_number')]):
                raise serializers.ValidationError(
                    {'gstin': 'Provide at least one verification ID: GSTIN, PAN, or Aadhar number.'}
                )

        if attrs.get('is_store_owner'):
            if not attrs.get('store_name', '').strip():
                raise serializers.ValidationError({'store_name': 'Store name is required.'})
            if not attrs.get('store_url', '').strip():
                raise serializers.ValidationError({'store_url': 'Store website URL is required.'})
            if not any([attrs.get('gstin'), attrs.get('pan_number'), attrs.get('aadhar_number')]):
                raise serializers.ValidationError(
                    {'gstin': 'Provide at least one verification ID: GSTIN, PAN, or Aadhar number.'}
                )

        return attrs

    @transaction.atomic
    def create(self, validated_data):
        # Pop role-specific fields before creating the User
        company_name  = validated_data.pop('company_name', '')
        gstin         = validated_data.pop('gstin', '')
        pan_number    = validated_data.pop('pan_number', '')
        aadhar_number = validated_data.pop('aadhar_number', '')
        store_name        = validated_data.pop('store_name', '')
        store_type        = validated_data.pop('store_type', 'online')
        store_category    = validated_data.pop('store_category', '')
        store_url         = validated_data.pop('store_url', '')
        store_locator_url = validated_data.pop('store_locator_url', '')
        password      = validated_data.pop('password')

        # Auto-generate a unique username from the email prefix
        base = validated_data['email'].split('@')[0][:20]
        username = base
        if User.objects.filter(username=username).exists():
            username = f"{base}_{uuid.uuid4().hex[:6]}"

        user = User(username=username, **validated_data)
        user.set_password(password)
        user.save()

        if user.is_store_owner:
            # Store owners also get a Company record so they can post jobs & have a career page
            user.is_company = True
            user.save(update_fields=['is_company'])
            from apps.companies.models import Company
            Company.objects.create(
                user=user,
                name=store_name or 'My Store',
                gst_number=gstin,
                pan_number=pan_number,
                aadhar_number=aadhar_number,
                contact_email=user.email,
            )
            from apps.stores.models import Store
            Store.objects.create(
                user=user,
                name=store_name,
                store_type=store_type or 'online',
                category=store_category,
                website_url=store_url,
                store_locator_url=store_locator_url,
                gst_number=gstin,
                pan_number=pan_number,
                aadhar_number=aadhar_number,
                contact_email=user.email,
            )
        elif user.is_company:
            from apps.companies.models import Company
            Company.objects.create(
                user=user,
                name=company_name,
                gst_number=gstin,
                pan_number=pan_number,
                aadhar_number=aadhar_number,
                contact_email=user.email,
            )
        else:
            from apps.jobseekers.models import JobSeeker
            JobSeeker.objects.create(user=user)

        return user

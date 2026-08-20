"""Serializers for the `authentication` app.

`UserSerializer` shapes the current user for read/update responses (used by
`MeView` and nested into login/register responses); `RegisterSerializer`
drives the multi-step signup flow, validating role-specific fields and
fanning out to create the related `Company`, `Store`, or `JobSeeker` record
that goes with a new account.
"""
import uuid
from django.contrib.auth import get_user_model
from django.core import signing
from django.db import transaction
from rest_framework import serializers

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    """Read/update representation of the authenticated user.

    Used by `MeView` (GET/PATCH `/api/auth/me/`) and embedded in the
    `LoginView`/`RegisterView` responses so the frontend receives the user's
    profile alongside JWT tokens.
    """
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name',
                  'phone', 'is_company', 'is_job_seeker', 'is_store_owner', 'created_at']
        read_only_fields = ['id', 'created_at']


class RegisterSerializer(serializers.ModelSerializer):
    """Validates and creates a new account during registration (`RegisterView`, POST `/api/auth/register/`).

    Accepts a common set of fields plus write-only, role-conditional field
    groups: company fields (name + at least one of GSTIN/PAN/Aadhar) used
    when `is_company` is set, and store fields used when `is_store_owner`
    is set. Requires a valid `email_verified_token` (issued by
    `VerifyOTPView` after OTP verification) so an account can't be created
    for an email the requester doesn't control.
    """
    password = serializers.CharField(write_only=True, min_length=8)  # Plain-text password from the client; never serialized back out, hashed in create()
    email_verified_token = serializers.CharField(write_only=True)  # Signed token from VerifyOTPView proving the email was OTP-verified; consumed (not stored) in validate()

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
        # Note: these role-specific fields (company_name, gstin, etc.) are declared
        # explicitly above as serializer fields, not model fields on User — they're
        # popped out in create() and used to build the related Company/Store record.
        model = User
        fields = [
            'email', 'password', 'email_verified_token',
            'first_name', 'last_name', 'phone',
            'is_company', 'is_job_seeker', 'is_store_owner',
            'company_name', 'gstin', 'pan_number', 'aadhar_number',
            'store_name', 'store_type', 'store_category', 'store_url', 'store_locator_url',
        ]

    def validate_email(self, value):
        """Reject registration if the email is already in use; DRF calls this automatically for the `email` field during `is_valid()`. Normalizes to lowercase so lookups/storage are case-insensitive."""
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('An account with this email already exists.')
        return value.lower()

    def validate(self, attrs):
        """Cross-field validation run by `is_valid()` after all per-field validators.

        Confirms the `email_verified_token` (from `VerifyOTPView`) matches
        the submitted email and hasn't expired, then enforces role-specific
        required fields: companies need a name and at least one government
        ID (GSTIN/PAN/Aadhar); store owners need a store name, store URL,
        and at least one government ID.
        """
        # Verify the signed token matches the submitted email
        token = attrs.pop('email_verified_token', '')
        try:
            payload = signing.loads(token, salt='stepsdoor-email-verified', max_age=3600)
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
        """Create the User and its role-specific related record (Company, Store, or JobSeeker).

        Called by `RegisterView.create()` via `serializer.save()` after
        validation passes. Wrapped in `transaction.atomic` because a
        store-owner signup writes to three tables (User, Company, Store)
        that must all succeed or all roll back together.
        """
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
        # (the frontend never collects a username — StepsDoor accounts log in by email)
        base = validated_data['email'].split('@')[0][:20]  # Truncate to 20 chars to leave room for the disambiguation suffix within username's max_length
        username = base
        if User.objects.filter(username=username).exists():
            username = f"{base}_{uuid.uuid4().hex[:6]}"  # Collision fallback: append a short random hex suffix to keep username unique

        user = User(username=username, **validated_data)
        user.set_password(password)  # Hashes the plaintext password (PBKDF2 by default) instead of storing it raw
        user.save()

        if user.is_store_owner:
            # Store owners also get a Company record so they can post jobs & have a career page
            user.is_company = True
            user.save(update_fields=['is_company'])  # Only touch is_company to avoid re-writing the whole row / re-triggering full save() logic
            from apps.companies.models import Company  # Local import avoids a circular import between the authentication and companies apps
            Company.objects.create(
                user=user,
                name=store_name or 'My Store',
                gst_number=gstin,
                pan_number=pan_number,
                aadhar_number=aadhar_number,
                contact_email=user.email,
            )
            from apps.stores.models import Store  # Local import avoids a circular import between the authentication and stores apps
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
            from apps.companies.models import Company  # Local import avoids a circular import between the authentication and companies apps
            Company.objects.create(
                user=user,
                name=company_name,
                gst_number=gstin,
                pan_number=pan_number,
                aadhar_number=aadhar_number,
                contact_email=user.email,
            )
        else:
            # Default role: plain job seeker (neither is_company nor is_store_owner set)
            from apps.jobseekers.models import JobSeeker  # Local import avoids a circular import between the authentication and jobseekers apps
            JobSeeker.objects.create(user=user)

        return user

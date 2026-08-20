"""Models for the `authentication` app.

Defines StepsDoor's custom `User` model (set as `AUTH_USER_MODEL`) which
extends Django's `AbstractUser` with role flags distinguishing companies,
job seekers, and store owners, plus `EmailOTP`, a short-lived one-time
password used to verify a user's email address before registration
completes (see `apps.authentication.views.SendOTPView` /
`VerifyOTPView` and `apps.authentication.serializers.RegisterSerializer`).
"""
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone
from datetime import timedelta


class User(AbstractUser):
    """Custom user model for StepsDoor.

    Extends Django's built-in `AbstractUser` (which already supplies
    username, password, email, first/last name, is_staff/is_active/
    is_superuser, and date_joined) with StepsDoor-specific fields needed to
    tell apart the three kinds of accounts on the platform: job seekers
    (default), companies that post paid job listings, and store owners who
    run a storefront/catalogue. Set as `AUTH_USER_MODEL` in settings, so this
    is the model Django's auth system, JWT auth, and `request.user` all use.
    """
    phone = models.CharField(max_length=15, blank=True)  # Contact number; optional, not used for login
    is_company = models.BooleanField(default=False)  # True for company-role accounts (can post jobs, has a related Company record); checked by IsCompanyUser-style permissions
    is_job_seeker = models.BooleanField(default=False)  # True for job-seeker accounts (browse jobs, save jobs, set alerts); default role for accounts that are neither company nor store owner
    is_store_owner = models.BooleanField(default=False)  # True for store owners; RegisterSerializer.create() also force-sets is_company=True for these so they get a Company (and therefore a careers page) in addition to their Store
    created_at = models.DateTimeField(auto_now_add=True)  # Account creation timestamp, set once automatically on first save

    class Meta:
        verbose_name = 'User'
        verbose_name_plural = 'Users'

    def __str__(self):
        """Human-readable label used in Django admin and shell/debug output; prefers email, falls back to username for accounts without one."""
        return self.email or self.username


class EmailOTP(models.Model):
    """A one-time password (OTP) sent to an email address to verify ownership before registration.

    Created by `SendOTPView.post()` and consumed by `VerifyOTPView.post()`
    in `apps.authentication.views`. Verifying an OTP produces a signed token
    that `RegisterSerializer.validate()` requires before it will create the
    account, preventing registration with an unowned email address.
    """
    email = models.EmailField(db_index=True)  # Indexed because both SendOTPView and VerifyOTPView filter/lookup by email on every request
    otp = models.CharField(max_length=6)  # The 6-digit numeric code (zero-padded), emailed to the user and compared against user input
    expires_at = models.DateTimeField()  # OTP is only valid until this time (10 minutes after generation, see generate())
    is_verified = models.BooleanField(default=False)  # Flipped to True once VerifyOTPView confirms the code, so it can't be verified twice and is excluded from future "latest OTP" lookups
    created_at = models.DateTimeField(auto_now_add=True)  # When the OTP was generated; used for the 60-second resend rate limit in SendOTPView

    class Meta:
        verbose_name = 'Email OTP'
        ordering = ['-created_at']  # Most recent OTP first, so EmailOTP.objects.filter(...).latest('created_at') style lookups return the current one

    @classmethod
    def generate(cls, email):
        """Delete old OTPs for this email and create a fresh one.

        Called by `SendOTPView.post()` each time a user requests a
        verification code, so only one live OTP exists per email at a time.
        """
        import random
        cls.objects.filter(email__iexact=email).delete()
        return cls.objects.create(
            email=email.lower(),
            otp=f"{random.randint(0, 999999):06d}",
            expires_at=timezone.now() + timedelta(minutes=10),
        )

    def is_valid(self):
        """True if this OTP has not already been used and has not expired; checked by `VerifyOTPView.post()` before accepting a code."""
        return not self.is_verified and timezone.now() < self.expires_at

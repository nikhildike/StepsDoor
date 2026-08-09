from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone
from datetime import timedelta


class User(AbstractUser):
    """Custom user model for Linksdoor."""
    phone = models.CharField(max_length=15, blank=True)
    is_company = models.BooleanField(default=False)
    is_job_seeker = models.BooleanField(default=False)
    is_store_owner = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'User'
        verbose_name_plural = 'Users'

    def __str__(self):
        return self.email or self.username


class EmailOTP(models.Model):
    email = models.EmailField(db_index=True)
    otp = models.CharField(max_length=6)
    expires_at = models.DateTimeField()
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Email OTP'
        ordering = ['-created_at']

    @classmethod
    def generate(cls, email):
        """Delete old OTPs for this email and create a fresh one."""
        import random
        cls.objects.filter(email__iexact=email).delete()
        return cls.objects.create(
            email=email.lower(),
            otp=f"{random.randint(0, 999999):06d}",
            expires_at=timezone.now() + timedelta(minutes=10),
        )

    def is_valid(self):
        return not self.is_verified and timezone.now() < self.expires_at

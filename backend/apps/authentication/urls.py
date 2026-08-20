"""URL routes for the `authentication` app, mounted under `/api/auth/` (see the project's root URLconf)."""
from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from . import views

urlpatterns = [
    # POST — email + password login, issues an access/refresh JWT pair. Anonymous.
    path('login/', views.LoginView.as_view(), name='login'),
    # POST — exchange a valid refresh token for a new access token (simplejwt built-in view). Anonymous (holder of a valid refresh token).
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    # POST — create a new account (job seeker, company, or store owner) after email OTP verification. Anonymous.
    path('register/', views.RegisterView.as_view(), name='register'),
    # POST — generate and email a 6-digit OTP to verify an address before registration. Anonymous.
    path('send-otp/', views.SendOTPView.as_view(), name='send_otp'),
    # POST — verify a submitted OTP and return a signed token required by register/. Anonymous.
    path('verify-otp/', views.VerifyOTPView.as_view(), name='verify_otp'),
    # GET/PATCH — retrieve or update the logged-in user's own profile. Requires authentication (any role).
    path('me/', views.MeView.as_view(), name='me'),
]

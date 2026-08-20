"""Views for the `authentication` app.

Implements the full anonymous auth flow used by the web/mobile clients:
email+password login (`LoginView`), email OTP verification prior to signup
(`SendOTPView`, `VerifyOTPView`), account registration (`RegisterView`), and
retrieving/updating the current user's profile (`MeView`). All views except
`MeView` are open to unauthenticated requests since they exist to establish
a session in the first place.
"""
from django.contrib.auth import get_user_model, authenticate
from django.core import signing
from django.core.mail import send_mail
from django.conf import settings
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import EmailOTP
from .serializers import RegisterSerializer, UserSerializer

User = get_user_model()


class LoginView(APIView):
    """
    Login with email + password. Accepts the 'username' field as the email
    (matching what TokenObtainPairView expects) so the frontend form works
    without changes.
    Returns {user, access, refresh}.
    """
    permission_classes = [permissions.AllowAny]  # Must be reachable by unauthenticated clients — this is how they become authenticated

    def post(self, request):
        """Authenticate by email + password and issue a JWT pair. Called on every login form submission (POST `/api/auth/login/`), anonymous access."""
        email = request.data.get('username', '').strip().lower()
        password = request.data.get('password', '')

        if not email or not password:
            return Response({'detail': 'Email and password are required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user_obj = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            return Response({'detail': 'No account found with this email.'}, status=status.HTTP_401_UNAUTHORIZED)

        # Django's auth backend authenticates by username, so look up the real username
        # from the email above, then authenticate() to verify the password (and run any
        # configured auth backend checks, e.g. is_active) rather than comparing hashes directly.
        user = authenticate(request, username=user_obj.username, password=password)
        if user is None:
            return Response({'detail': 'Incorrect password.'}, status=status.HTTP_401_UNAUTHORIZED)

        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        })


class RegisterView(generics.CreateAPIView):
    """Register a new user account. Returns user + JWT tokens."""
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]  # Anonymous — this is the account-creation endpoint itself

    def create(self, request, *args, **kwargs):
        """Validate and create the account via `RegisterSerializer`, then log the new user in by issuing JWT tokens. Called on POST `/api/auth/register/`, anonymous access."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response(
            {
                'user': UserSerializer(user).data,
                'access': str(refresh.access_token),
                'refresh': str(refresh),
            },
            status=status.HTTP_201_CREATED,
        )


class SendOTPView(APIView):
    """Generate a 6-digit OTP and email it. Rate-limited to once per 60 seconds."""
    permission_classes = [permissions.AllowAny]  # Anonymous — called before an account exists, as the first step of registration

    def post(self, request):
        """Generate and email a fresh OTP for the given address. Called by the "verify email" step of the signup form, before `RegisterView`; anonymous access."""
        email = request.data.get('email', '').strip().lower()
        if not email:
            return Response({'detail': 'Email is required.'}, status=status.HTTP_400_BAD_REQUEST)

        # Basic rate-limit: block if an OTP was sent in the last 60 seconds
        # (prevents accidental double-submits and simple email-bombing abuse)
        from django.utils import timezone
        from datetime import timedelta
        recent = EmailOTP.objects.filter(
            email=email,
            created_at__gte=timezone.now() - timedelta(seconds=60),
        ).exists()
        if recent:
            return Response(
                {'detail': 'Please wait 60 seconds before requesting another OTP.'},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        otp_obj = EmailOTP.generate(email)

        send_mail(
            subject='Your StepsDoor verification code',
            message=(
                f"Your OTP is: {otp_obj.otp}\n\n"
                f"It expires in 10 minutes. Do not share it with anyone."
            ),
            from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@stepsdoor.in'),
            recipient_list=[email],
            fail_silently=False,
        )

        return Response({'detail': 'OTP sent to your email.'})


class VerifyOTPView(APIView):
    """Verify the OTP. Returns a signed token used during registration."""
    permission_classes = [permissions.AllowAny]  # Anonymous — called before an account exists, as the second step of registration

    def post(self, request):
        """Check the submitted code against the latest unverified OTP for the email, and if valid mark it used and return a signed token. Called by the signup form after the user enters the emailed code; anonymous access."""
        email = request.data.get('email', '').strip().lower()
        otp = request.data.get('otp', '').strip()

        if not email or not otp:
            return Response({'detail': 'Email and OTP are required.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            otp_obj = EmailOTP.objects.filter(email=email, is_verified=False).latest('created_at')
        except EmailOTP.DoesNotExist:
            return Response({'detail': 'No OTP found for this email. Please request a new one.'}, status=status.HTTP_400_BAD_REQUEST)

        if not otp_obj.is_valid():
            return Response({'detail': 'OTP has expired. Please request a new one.'}, status=status.HTTP_400_BAD_REQUEST)

        if otp_obj.otp != otp:
            return Response({'detail': 'Incorrect OTP. Please try again.'}, status=status.HTTP_400_BAD_REQUEST)

        otp_obj.is_verified = True
        otp_obj.save(update_fields=['is_verified'])  # Mark used so it can't be replayed and won't be picked up by future "latest OTP" lookups

        # Sign a token the frontend passes during registration (valid 1 hour).
        # Cryptographically signed (not just a random string) so RegisterSerializer.validate()
        # can trust it was actually issued by this view and hasn't been tampered with or expired.
        token = signing.dumps({'email': email}, salt='stepsdoor-email-verified')
        return Response({'verified_token': token})


class MeView(generics.RetrieveUpdateAPIView):
    """Retrieve or update the currently authenticated user."""
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]  # Requires a valid JWT — this exposes/edits the caller's own profile

    def get_object(self):
        """Return the requesting user themself rather than looking one up by URL pk, since `MeView` always operates on `request.user`. Called by DRF's `RetrieveUpdateAPIView` for both GET and PATCH `/api/auth/me/`."""
        return self.request.user

"""
Root URL configuration for StepsDoor project.

Referenced via `ROOT_URLCONF = 'config.urls'` in
`config/settings/base.py`. Each `include()` below wires in one Django
app's own `urls.py`, all namespaced under an `/api/<app>/` prefix so the
React web frontend and Expo mobile app can share the same API surface.
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView

urlpatterns = [
    # Django admin site — used to manage ScraperSource rows, review scraped
    # Tender/GovtJob data, moderate job listings, etc.
    path('admin/', admin.site.urls),

    # Authentication (JWT login, register, me)
    path('api/auth/', include('apps.authentication.urls')),

    # Private job board — company-paid job listings, click tracking, saved
    # jobs, subscriptions/billing, click analytics, and private job alerts.
    path('api/jobs/', include('apps.jobs.urls')),
    path('api/companies/', include('apps.companies.urls')),
    path('api/jobseekers/', include('apps.jobseekers.urls')),
    path('api/subscriptions/', include('apps.subscriptions.urls')),
    path('api/payments/', include('apps.payments.urls')),
    path('api/analytics/', include('apps.analytics.urls')),
    path('api/alerts/', include('apps.alerts.urls')),

    # Government tenders & jobs — scraped/free-to-browse content (see
    # apps.tenders / apps.govtjobs and the scrapers/ Scrapy project).
    path('api/tenders/', include('apps.tenders.urls')),
    path('api/govtjobs/', include('apps.govtjobs.urls')),

    # Freelancers — freelancer profiles (early-stage app).
    path('api/freelancers/', include('apps.freelancers.urls')),

    # Stores — company storefront/catalogue listings, including the
    # affiliate-aware outbound redirect endpoint (see core.affiliate).
    path('api/stores/', include('apps.stores.urls')),

    # API schema & docs — drf-spectacular: raw OpenAPI schema plus
    # Swagger UI and ReDoc viewers for interactive API documentation.
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]

# In DEBUG (local dev) only, let Django's dev server serve uploaded MEDIA
# files directly. In production, media is served from DigitalOcean Spaces
# (S3-compatible storage) instead, so this route is unnecessary there.
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

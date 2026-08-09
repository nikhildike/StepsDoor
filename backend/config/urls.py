"""
Root URL configuration for Linksdoor project.
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView

urlpatterns = [
    path('admin/', admin.site.urls),

    # Authentication (JWT login, register, me)
    path('api/auth/', include('apps.authentication.urls')),

    # Private job board
    path('api/jobs/', include('apps.jobs.urls')),
    path('api/companies/', include('apps.companies.urls')),
    path('api/jobseekers/', include('apps.jobseekers.urls')),
    path('api/subscriptions/', include('apps.subscriptions.urls')),
    path('api/payments/', include('apps.payments.urls')),
    path('api/analytics/', include('apps.analytics.urls')),
    path('api/alerts/', include('apps.alerts.urls')),

    # Government tenders & jobs
    path('api/tenders/', include('apps.tenders.urls')),
    path('api/govtjobs/', include('apps.govtjobs.urls')),

    # Freelancers
    path('api/freelancers/', include('apps.freelancers.urls')),

    # Stores
    path('api/stores/', include('apps.stores.urls')),

    # API schema & docs
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

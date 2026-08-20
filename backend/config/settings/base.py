"""
Base Django settings for StepsDoor project.

Holds settings shared by every environment. `development.py` and
`production.py` both do `from .base import *` and then layer on
environment-specific overrides (DEBUG, CORS, email backend, etc.) — see
those files for what differs. Secrets and environment-dependent values are
read via `python-decouple`'s `config()` (which reads from a `.env` file
locally, or real process environment variables in deployment) rather than
hardcoded, so the same codebase runs in dev and production without edits.
"""

from pathlib import Path
from datetime import timedelta
from decouple import config, Csv

# Build paths inside the project like this: BASE_DIR / 'subdir'.
# BASE_DIR points to backend/ (where manage.py lives)
BASE_DIR = Path(__file__).resolve().parent.parent.parent


# ===========================================================================
# SECURITY
# ===========================================================================

# Falls back to an obviously-fake insecure key so the project still boots
# without a .env file in a fresh dev checkout; production deployments MUST
# set a real SECRET_KEY via environment variable.
SECRET_KEY = config('SECRET_KEY', default='django-insecure-change-me-in-production')

DEBUG = config('DEBUG', default=True, cast=bool)  # overridden explicitly per-environment below

# Comma-separated host list from the env var, parsed into a list via
# decouple's Csv() cast (e.g. "stepsdoor.in,www.stepsdoor.in").
ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='localhost,127.0.0.1', cast=Csv())


# ===========================================================================
# APPLICATION DEFINITION
# ===========================================================================

DJANGO_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
]

# Third-party packages this project depends on:
#   django.contrib.postgres — Postgres-only field types (used by the
#     SearchVectorField on Tender/GovtJob for full-text search)
#   rest_framework / rest_framework_simplejwt — DRF + JWT auth
#   corsheaders — CORS handling for the separate React/Expo clients
#   django_filters — DjangoFilterBackend used as a DRF filter backend
#   django_celery_beat — DB-backed periodic task schedule (scrape_all_portals,
#     match_tender_alerts) editable from Django admin
#   drf_spectacular — OpenAPI schema generation for /api/docs/ and /api/redoc/
#   import_export — admin import/export (e.g. bulk-managing scraped data)
THIRD_PARTY_APPS = [
    'django.contrib.postgres',
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'django_filters',
    'django_celery_beat',
    'drf_spectacular',
    'import_export',
]

# StepsDoor's own apps — see CLAUDE.md's app table for what each one owns.
LOCAL_APPS = [
    'apps.authentication',
    'apps.companies',
    'apps.jobs',
    'apps.jobseekers',
    'apps.subscriptions',
    'apps.payments',
    'apps.analytics',
    'apps.alerts',
    'apps.notifications',
    'apps.tenders',
    'apps.govtjobs',
    'apps.freelancers',
    'apps.stores',
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS


# ===========================================================================
# MIDDLEWARE
# ===========================================================================

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    # Must sit high in the stack (before CommonMiddleware) so CORS headers
    # are added to every response, including ones from other middleware.
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'
ASGI_APPLICATION = 'config.asgi.application'


# ===========================================================================
# DATABASE
# ===========================================================================

# NOTE: DATABASE_URL is read from the environment (per CLAUDE.md, production
# uses DigitalOcean Managed PostgreSQL 16 while dev uses SQLite), but the
# DATABASES dict below currently always hardcodes the sqlite3 backend rather
# than parsing DATABASE_URL — i.e. this env var is not actually consumed
# here yet. Left as-is (no logic changes) since fixing that is outside the
# scope of a documentation pass.
DATABASE_URL = config('DATABASE_URL', default='sqlite:///db.sqlite3')

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}


# ===========================================================================
# AUTH
# ===========================================================================

# Custom user model (extends AbstractUser) with role flags such as
# is_company / is_job_seeker / is_store_owner — see apps/authentication/models.py
# and core/permissions.py, which reads those flags.
AUTH_USER_MODEL = 'authentication.User'

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# ===========================================================================
# INTERNATIONALIZATION
# ===========================================================================

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_TZ = True


# ===========================================================================
# STATIC & MEDIA FILES
# ===========================================================================

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'


# ===========================================================================
# DEFAULT PRIMARY KEY
# ===========================================================================

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'


# ===========================================================================
# DJANGO REST FRAMEWORK
# ===========================================================================

REST_FRAMEWORK = {
    # All auth is JWT-based (see SIMPLE_JWT below) — no session/basic auth,
    # since the API is consumed by separate React and React Native clients.
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    # Secure-by-default: endpoints require authentication unless a view
    # explicitly opts into AllowAny (e.g. public job/tender/govt-job browse
    # endpoints) or a more specific permission (see core/permissions.py).
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_FILTER_BACKENDS': (
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ),
    # See core/pagination.py — 20 results/page by default across all list
    # endpoints unless a view overrides pagination_class.
    'DEFAULT_PAGINATION_CLASS': 'core.pagination.StandardResultsPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_RENDERER_CLASSES': (
        'rest_framework.renderers.JSONRenderer',
    ),
    # See core/exceptions.py — reshapes all API errors into one consistent
    # {success, error: {code, message, details}} JSON envelope.
    'EXCEPTION_HANDLER': 'core.exceptions.custom_exception_handler',
    # drf-spectacular's schema generator, used to auto-build the OpenAPI
    # schema served at /api/schema/, /api/docs/, /api/redoc/.
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}

# drf-spectacular config for the generated OpenAPI schema/docs UI (see
# config/urls.py for the /api/schema/, /api/docs/, /api/redoc/ routes).
# SERVE_INCLUDE_SCHEMA=False keeps the raw schema out of every endpoint's
# own auto-generated docs listing (it's served at its own dedicated route).
SPECTACULAR_SETTINGS = {
    'TITLE': 'StepsDoor API',
    'DESCRIPTION': 'Government Tenders, Government Jobs & Private Job Board for India',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
}


# ===========================================================================
# SIMPLE JWT
# ===========================================================================

# Access tokens are short-lived (1 hour) for security; refresh tokens live a
# week so users aren't forced to re-login constantly. ROTATE_REFRESH_TOKENS
# issues a new refresh token on every refresh (paired with the web
# frontend's Axios interceptor auto-refresh-on-401 behaviour), but
# BLACKLIST_AFTER_ROTATION is off so old refresh tokens aren't invalidated
# (the blacklist app isn't installed) — acceptable tradeoff for this app's
# threat model. SIGNING_KEY reuses Django's SECRET_KEY rather than a
# separate key.
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': False,
    'UPDATE_LAST_LOGIN': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
}


# ===========================================================================
# CORS
# ===========================================================================

# Allow cookies/Authorization headers to be sent cross-origin (frontend and
# backend run on different ports/domains). The actual allowed origins
# differ per environment — see CORS_ALLOW_ALL_ORIGINS in development.py vs
# CORS_ALLOWED_ORIGINS in production.py.
CORS_ALLOW_CREDENTIALS = True


# ===========================================================================
# CELERY
# ===========================================================================

# Redis is both the message broker and the result backend (same URL, two
# different Redis DB indices are NOT used here — both point at db 0 by
# default). Used by the scraper pipeline (scrape_all_portals,
# scrape_portal, match_tender_alerts — see CLAUDE.md's Data Pipeline
# section) and by other async tasks (alerts, notifications).
CELERY_BROKER_URL = config('CELERY_BROKER_URL', default='redis://localhost:6379/0')
CELERY_RESULT_BACKEND = config('CELERY_BROKER_URL', default='redis://localhost:6379/0')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = TIME_ZONE
# django-celery-beat stores the periodic task schedule in the DB (editable
# via Django admin) rather than in a static Python schedule, so ops can
# change scrape frequency without a deploy.
CELERY_BEAT_SCHEDULER = 'django_celery_beat.schedulers:DatabaseScheduler'

# Scraper runs every 6 hours
SCRAPER_SCHEDULE_HOURS = config('SCRAPER_SCHEDULE_HOURS', default=6, cast=int)


# ===========================================================================
# CACHE (django-redis — falls back to in-memory in dev if Redis unavailable)
# ===========================================================================

CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': config('REDIS_URL', default='redis://localhost:6379/1'),
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        },
    }
}


# ===========================================================================
# RAZORPAY
# ===========================================================================

# Used by apps.payments to create/verify Razorpay Subscriptions and process
# webhooks for company subscription billing. Blank defaults let the project
# boot without real credentials in dev; payment flows simply won't work
# until these are set.
RAZORPAY_KEY_ID = config('RAZORPAY_KEY_ID', default='')
RAZORPAY_KEY_SECRET = config('RAZORPAY_KEY_SECRET', default='')


# ===========================================================================
# SENDGRID
# ===========================================================================

# Used via django-anymail for transactional email (alerts, notifications)
# in production. In development, EMAIL_BACKEND is swapped to the console
# backend (see development.py) so this key isn't required locally.
SENDGRID_API_KEY = config('SENDGRID_API_KEY', default='')


# ===========================================================================
# FIREBASE
# ===========================================================================

# Path to the Firebase service-account JSON credentials file, used by
# apps.notifications to send FCM push notifications (job alerts, tender
# alerts) to the Expo mobile app.
FIREBASE_CREDENTIALS_PATH = config('FIREBASE_CREDENTIALS_PATH', default='')


# ===========================================================================
# AFFILIATE
# ===========================================================================

# Amazon Associates tracking tag (e.g. "stepsdoor-21").
# Appended as ?tag= to amazon.in URLs when no explicit affiliate_url is set on the store.
AMAZON_AFFILIATE_TAG = config('AMAZON_AFFILIATE_TAG', default='')

# Cuelinks publisher source ID — used by the web front-end to load the auto-link JS snippet.
# Not a secret; safe to expose in front-end env vars.
CUELINKS_PUBLISHER_ID = config('CUELINKS_PUBLISHER_ID', default='')

"""
Production settings for StepsDoor.

Selected via `DJANGO_SETTINGS_MODULE=config.settings.production`, set as a
real environment variable on the DigitalOcean App Platform deployment
(never as the process default, unlike development — see wsgi.py/asgi.py).
Imports every base.py setting and tightens what dev loosens: DEBUG is off
(no verbose error pages/stack traces leaking to users) and CORS is
restricted to an explicit origin allowlist instead of accepting any origin.

NOTE: unlike development.py, this module does not currently override
EMAIL_BACKEND/DEFAULT_FROM_EMAIL or add S3/Spaces STORAGES config here —
those are expected to come from base.py defaults and/or environment
variables (SENDGRID_API_KEY etc. in base.py) as the deployment is built out.
"""

from .base import *

DEBUG = False  # never show Django's debug/traceback pages in production

# Real frontend domain(s) must be added here (or sourced from an env var)
# before deploying, otherwise the web frontend won't be able to call the
# API cross-origin. Deliberately empty/fail-closed rather than wide-open
# like development's CORS_ALLOW_ALL_ORIGINS.
CORS_ALLOWED_ORIGINS = []  # to be filled with actual frontend domains

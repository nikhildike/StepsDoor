"""
Local development settings for StepsDoor.

Selected via `DJANGO_SETTINGS_MODULE=config.settings.development` (the
default in manage.py/wsgi.py/asgi.py). Imports every base.py setting and
then loosens/simplifies a few of them for a frictionless local dev loop:
CORS is wide open and outbound email is just printed to the console instead
of actually being sent, so no SendGrid credentials are needed to run
locally. Contrast with production.py.
"""

from .base import *

DEBUG = True  # verbose error pages; explicit here even though base.py already reads DEBUG from env

# Dev convenience: accept requests from any origin (e.g. the Vite dev server
# on a dynamic port, Expo on a LAN IP) instead of maintaining an allowlist.
# Never do this in production — see CORS_ALLOWED_ORIGINS in production.py.
CORS_ALLOW_ALL_ORIGINS = True

# Print emails to the terminal instead of sending them
# (avoids needing real SendGrid credentials just to run locally; lets you
# read alert/notification emails straight from the runserver console).
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
DEFAULT_FROM_EMAIL = 'noreply@stepsdoor.in'

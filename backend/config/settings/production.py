"""
Production settings for StepsDoor.

Selected via `DJANGO_SETTINGS_MODULE=config.settings.production`, set as a
real environment variable on the DigitalOcean App Platform deployment
(never as the process default, unlike development — see wsgi.py/asgi.py).
Imports every base.py setting and tightens what dev loosens: DEBUG is off
(no verbose error pages/stack traces leaking to users) and CORS is
restricted to an explicit origin allowlist instead of accepting any origin.

Email goes out through SendGrid (django-anymail) — set SENDGRID_API_KEY and,
if not noreply@stepsdoor.in, DEFAULT_FROM_EMAIL (a SendGrid-verified sender).
S3/Spaces STORAGES config is not added here yet.
"""

from .base import *

DEBUG = False  # never show Django's debug/traceback pages in production

# Real frontend domain(s) must be added here (or sourced from an env var)
# before deploying, otherwise the web frontend won't be able to call the
# API cross-origin. Deliberately empty/fail-closed rather than wide-open
# like development's CORS_ALLOW_ALL_ORIGINS.
EMAIL_BACKEND = 'anymail.backends.sendgrid.EmailBackend'  # uses ANYMAIL['SENDGRID_API_KEY'] from base.py
# anymail.W003 "dropped official support for SendGrid": anymail lost its free SendGrid
# test account in Jul 2025 (https://github.com/anymail/django-anymail/issues/432). The
# backend kept working and was never deprecated; SendGrid restored the account on
# 19 Oct 2026 and the maintainer said the next release removes this warning. Silenced so
# every manage.py command in production isn't noisy — remove once anymail stops raising it.
SILENCED_SYSTEM_CHECKS = ['anymail.W003']
CORS_ALLOWED_ORIGINS = []  # to be filled with actual frontend domains

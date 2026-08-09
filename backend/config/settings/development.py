from .base import *

DEBUG = True

CORS_ALLOW_ALL_ORIGINS = True

# Print emails to the terminal instead of sending them
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
DEFAULT_FROM_EMAIL = 'noreply@linksdoor.in'

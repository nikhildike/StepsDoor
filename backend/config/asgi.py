"""
ASGI config for StepsDoor project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/6.0/howto/deployment/asgi/
"""

import os

from django.core.asgi import get_asgi_application

# Tell Django which settings module to load. `setdefault` means this only
# takes effect if DJANGO_SETTINGS_MODULE isn't already set in the process
# environment — e.g. a production deployment (DigitalOcean App Platform) sets
# DJANGO_SETTINGS_MODULE=config.settings.production externally, which takes
# precedence over this development default.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')

# The ASGI callable an ASGI server (e.g. daphne/uvicorn) looks up and serves.
application = get_asgi_application()

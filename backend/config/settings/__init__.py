# Marks `config/settings/` as a Python package. Settings are split into
# base.py (shared defaults), development.py, and production.py so that
# DJANGO_SETTINGS_MODULE can point at an environment-specific module
# (e.g. `config.settings.development`) while both import `from .base import *`.

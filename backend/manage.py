#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys


def main():
    """Run administrative tasks.

    Entrypoint used for local/dev management commands (runserver,
    makemigrations, migrate, test, etc.) — invoked as
    `python manage.py <command>`.
    """
    # Default to the development settings module (which imports
    # `config.settings.base` and layers dev-only overrides such as
    # DEBUG=True and console email). `setdefault` means an already-set
    # DJANGO_SETTINGS_MODULE env var (e.g. explicitly exporting
    # config.settings.production for a one-off management command against
    # prod) takes precedence over this default.
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        # Most common cause: the virtualenv (backend/linksvenv/) isn't
        # activated, so Django isn't on this interpreter's PYTHONPATH.
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == '__main__':
    main()

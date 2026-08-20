"""Custom DRF exception handling for the StepsDoor API.

Wired in via `REST_FRAMEWORK['EXCEPTION_HANDLER']` in
`config/settings/base.py`, so it applies globally to every API view across
every app (jobs, tenders, govtjobs, payments, etc.) — any unhandled
`APIException` (or DRF-recognised exception such as `Http404` /
`PermissionDenied`) raised inside a view gets reshaped into a single
consistent JSON envelope instead of DRF's default ad-hoc error bodies, so
frontend/mobile clients only need to handle one error shape.
"""

from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status


def custom_exception_handler(exc, context):
    """
    Custom exception handler that returns a consistent JSON error format:

    {
        "success": false,
        "error": {
            "code": <status_code>,
            "message": <human-readable message>,
            "details": <field-level errors or None>
        }
    }

    Called automatically by DRF whenever a view raises an exception it knows
    how to handle (it is invoked in place of DRF's default
    `rest_framework.views.exception_handler` because of the EXCEPTION_HANDLER
    setting). Not called for exceptions DRF doesn't recognise (e.g. an
    unguarded `Exception` bug) — those still propagate to Django's own
    error handling.
    """
    # Call DRF's default exception handler first to get the standard error response.
    response = exception_handler(exc, context)

    if response is not None:
        data = response.data

        # Determine a top-level message
        if isinstance(data, dict):
            # Extract 'detail' key if present (common DRF pattern, e.g.
            # NotAuthenticated/PermissionDenied/NotFound all return
            # {'detail': '...'}) and treat any remaining keys (e.g.
            # per-field serializer validation errors) as structured details.
            message = data.get('detail', str(exc))
            details = {k: v for k, v in data.items() if k != 'detail'} or None
        elif isinstance(data, list):
            # Some validation errors (e.g. non_field_errors on a list
            # serializer) come back as a bare list rather than a dict.
            message = 'Validation error.'
            details = data
        else:
            # Fallback for any other shape DRF might return.
            message = str(data)
            details = None

        response.data = {
            'success': False,
            'error': {
                'code': response.status_code,
                'message': str(message),
                'details': details,
            }
        }

    return response

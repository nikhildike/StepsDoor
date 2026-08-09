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
    """
    # Call DRF's default exception handler first to get the standard error response.
    response = exception_handler(exc, context)

    if response is not None:
        data = response.data

        # Determine a top-level message
        if isinstance(data, dict):
            # Extract 'detail' key if present (common DRF pattern)
            message = data.get('detail', str(exc))
            details = {k: v for k, v in data.items() if k != 'detail'} or None
        elif isinstance(data, list):
            message = 'Validation error.'
            details = data
        else:
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

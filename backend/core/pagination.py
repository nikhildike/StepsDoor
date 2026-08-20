"""Shared DRF pagination configuration for the StepsDoor API."""

from rest_framework.pagination import PageNumberPagination


class StandardResultsPagination(PageNumberPagination):
    """Standard pagination used across all StepsDoor API endpoints.

    Set as `REST_FRAMEWORK['DEFAULT_PAGINATION_CLASS']` in
    `config/settings/base.py`, so every list endpoint in every app (job
    listings, tenders, govt jobs, companies, etc.) is paginated this way by
    default unless a specific view overrides `pagination_class`. Clients can
    request a different page size via `?page_size=` (capped at
    `max_page_size`) and page via `?page=`.
    """
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100
    page_query_param = 'page'

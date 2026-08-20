"""Custom DRF permission classes shared across StepsDoor apps.

`authentication.User` (see `apps/authentication/models.py`) carries
role flags (`is_company`, `is_job_seeker`, `is_store_owner`) since a single
User model serves all account types; the permission classes below gate view
access based on those flags, or on object ownership. They're used by view
`permission_classes` lists in apps such as `apps.stores` (IsStoreOwner is
wired into the store management views) and are available to any other app
(jobs, jobseekers, subscriptions, etc.) that needs to restrict an endpoint to
a particular account type or to the resource's owner.
"""

from rest_framework.permissions import BasePermission


class IsCompanyUser(BasePermission):
    """Allow access only to users who are registered as a company.

    Intended for company-only endpoints (e.g. posting/managing jobs,
    viewing analytics, managing a subscription) — checks the
    `request.user.is_company` role flag.
    """

    message = 'Only company accounts can perform this action.'

    def has_permission(self, request, view):
        """Return True only for an authenticated user with `is_company=True`.

        Called by DRF for every request to a view listing this class in
        `permission_classes`, before the view's handler method runs.
        """
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.is_company
        )


class IsJobSeeker(BasePermission):
    """Allow access only to users who are registered as job seekers.

    Intended for job-seeker-only endpoints (e.g. saved jobs, job alerts,
    seeker profile) — checks the `request.user.is_job_seeker` role flag.
    """

    message = 'Only job seeker accounts can perform this action.'

    def has_permission(self, request, view):
        """Return True only for an authenticated user with `is_job_seeker=True`.

        Called by DRF for every request to a view listing this class in
        `permission_classes`, before the view's handler method runs.
        """
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.is_job_seeker
        )


class IsStoreOwner(BasePermission):
    """Allow access only to users who are registered as store owners.

    Used by `apps.stores.views` to restrict store storefront/catalogue
    management endpoints (e.g. the redirect/visit endpoint's owner-facing
    counterparts) to accounts with the `is_store_owner` role flag.
    """

    message = 'Only store owner accounts can perform this action.'

    def has_permission(self, request, view):
        """Return True only for an authenticated user with `is_store_owner=True`.

        Called by DRF for every request to a view listing this class in
        `permission_classes`, before the view's handler method runs.
        """
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.is_store_owner
        )


class IsOwner(BasePermission):
    """Allow access only to the owner of the object.

    The object must have a `user` attribute pointing to the owning User.
    Intended for object-level checks on retrieve/update/delete views (e.g. a
    job seeker editing their own profile, a company editing its own job
    posting) where row-level ownership — not just account type — must be
    enforced.
    """

    message = 'You do not have permission to access this resource.'

    def has_object_permission(self, request, view, obj):
        """Return True if `request.user` owns `obj`, directly or via `obj.company`.

        Called by DRF only for detail-style actions (retrieve/update/
        destroy) after `has_permission` has already passed, once per object
        being accessed — this is what prevents one user from reading/editing
        another user's (or another company's) resource by guessing its ID.
        """
        user = getattr(obj, 'user', None)
        if user is None:
            # Try company.user for company-owned resources
            company = getattr(obj, 'company', None)
            if company is not None:
                user = getattr(company, 'user', None)
        return user == request.user

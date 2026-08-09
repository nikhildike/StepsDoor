from rest_framework.permissions import BasePermission


class IsCompanyUser(BasePermission):
    """Allow access only to users who are registered as a company."""

    message = 'Only company accounts can perform this action.'

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.is_company
        )


class IsJobSeeker(BasePermission):
    """Allow access only to users who are registered as job seekers."""

    message = 'Only job seeker accounts can perform this action.'

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.is_job_seeker
        )


class IsStoreOwner(BasePermission):
    """Allow access only to users who are registered as store owners."""

    message = 'Only store owner accounts can perform this action.'

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.is_store_owner
        )


class IsOwner(BasePermission):
    """Allow access only to the owner of the object.

    The object must have a `user` attribute pointing to the owning User.
    """

    message = 'You do not have permission to access this resource.'

    def has_object_permission(self, request, view, obj):
        user = getattr(obj, 'user', None)
        if user is None:
            # Try company.user for company-owned resources
            company = getattr(obj, 'company', None)
            if company is not None:
                user = getattr(company, 'user', None)
        return user == request.user

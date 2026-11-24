"""
Shared DRF view mixins.

`PublicActionsAuthMixin` lets a viewset skip authentication for its public actions
(so a stale/expired Authorization header on an anonymous browse request can't turn
into a 401). Used by apps.jobs.views.JobPostViewSet and
apps.freelancers.views.FreelancerProfileViewSet.
"""


class PublicActionsAuthMixin:
    """
    Skip authenticators for the actions listed in `public_actions`.

    DRF builds the request's authenticators inside `initialize_request`, *before*
    `ViewSetMixin` sets `self.action` (DRF 3.18.3+), so reading `self.action` there
    raised AttributeError and every request 500'd. The action is therefore resolved
    from the router's method map when `self.action` isn't set yet.
    """
    public_actions = ()  # e.g. ('list', 'retrieve')

    def _resolved_action(self):
        """The viewset action for this request, whether or not DRF has set `self.action` yet."""
        action = getattr(self, 'action', None)
        if action is None and getattr(self, 'request', None) is not None:
            action = getattr(self, 'action_map', {}).get(self.request.method.lower())
        return action

    def get_authenticators(self):
        """No authenticators for public actions; the normal (JWT) ones otherwise."""
        if self._resolved_action() in self.public_actions:
            return []
        return super().get_authenticators()

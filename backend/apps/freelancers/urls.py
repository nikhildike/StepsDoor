"""
URL routing for the `freelancers` app.

Registers `FreelancerProfileViewSet` on a DRF router, which auto-generates the
standard list/create/retrieve/update/delete routes plus the viewset's custom
@action routes (`me`, `<pk>/review`, `states`) documented in views.py.
"""
from django.urls import path, include
from rest_framework.routers import SimpleRouter

from . import views

router = SimpleRouter()
# GET /            -> list active freelancer profiles (public)
# POST /           -> create the caller's freelancer profile (authenticated)
# GET /<pk>/       -> retrieve a single freelancer profile (public)
# PUT/PATCH /<pk>/ -> update the caller's own freelancer profile (authenticated)
# DELETE /<pk>/    -> delete the caller's own freelancer profile (authenticated)
# GET/PUT/PATCH /me/        -> fetch or update the current user's own profile
# POST /<pk>/review/        -> submit (or update) a review for a freelancer
# GET /states/               -> list states that have active freelancer profiles, with counts
router.register(r'', views.FreelancerProfileViewSet, basename='freelancer')

urlpatterns = [
    path('', include(router.urls)),
]

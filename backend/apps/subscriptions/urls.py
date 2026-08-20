# URL routes for the `subscriptions` app — DRF router wires up the plan catalogue
# and subscription CRUD viewsets, including the `current` custom action.
from django.urls import path, include
from rest_framework.routers import SimpleRouter

from . import views

router = SimpleRouter()
# GET /plans/, GET /plans/<pk>/ — list/retrieve subscription plans. Public, no auth.
router.register(r'plans', views.PlanViewSet, basename='plan')
# GET/POST /, GET/PUT/PATCH/DELETE /<pk>/, GET /current/ — manage the caller's own
# subscriptions. Requires authentication (company or store-owner account).
router.register(r'', views.SubscriptionViewSet, basename='subscription')

urlpatterns = [
    path('', include(router.urls)),
]

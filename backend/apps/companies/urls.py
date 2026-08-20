"""URL routes for the `companies` app, mounted under `/api/companies/` (see the project's root URLconf)."""
from django.urls import path, include
from rest_framework.routers import SimpleRouter

from . import views

# Registers full CRUD (list/create/retrieve/update/delete) plus the `me` action on
# CompanyViewSet at the app root — e.g. GET/POST /api/companies/, GET/PATCH /api/companies/me/.
router = SimpleRouter()
router.register(r'', views.CompanyViewSet, basename='company')

urlpatterns = [
    # GET — public directory of companies with at least one active job post. Anonymous.
    path('public/', views.CompanyPublicListView.as_view(), name='company-public-list'),
    # GET — public career page for one company (profile + active jobs), looked up by slug. Anonymous.
    path('<slug:slug>/careers/', views.CompanyCareersView.as_view(), name='company-careers'),
    # Router-generated routes for CompanyViewSet (list/create/retrieve/update/delete/me). Requires authentication.
    path('', include(router.urls)),
]

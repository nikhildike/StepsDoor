from django.urls import path, include
from rest_framework.routers import SimpleRouter

from . import views

router = SimpleRouter()
router.register(r'', views.CompanyViewSet, basename='company')

urlpatterns = [
    path('public/', views.CompanyPublicListView.as_view(), name='company-public-list'),
    path('<slug:slug>/careers/', views.CompanyCareersView.as_view(), name='company-careers'),
    path('', include(router.urls)),
]

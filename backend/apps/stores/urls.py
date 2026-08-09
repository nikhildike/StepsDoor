from django.urls import path
from . import views

urlpatterns = [
    path('', views.PublicStoreListView.as_view(), name='store-list'),
    path('retail/', views.PublicRetailStoreListView.as_view(), name='retail-store-list'),
    path('me/', views.MyStoreView.as_view(), name='my-store'),
]

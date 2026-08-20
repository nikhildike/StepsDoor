# URL routes for the `stores` app — public shopping pages plus the store owner's self-service endpoint.
from django.urls import path
from . import views

urlpatterns = [
    # GET — list active, subscribed online stores (optionally filtered by ?category=). Public, no auth.
    path('', views.PublicStoreListView.as_view(), name='store-list'),
    # GET — list active, subscribed retail-chain stores (optionally filtered by ?category=). Public, no auth.
    path('retail/', views.PublicRetailStoreListView.as_view(), name='retail-store-list'),
    # GET/PUT/PATCH — view or update the caller's own store. Requires authentication as a store owner.
    path('me/', views.MyStoreView.as_view(), name='my-store'),
    # POST — record a click on the given store and return its resolved (affiliate) redirect URL. Public, no auth.
    path('<int:pk>/click/', views.StoreClickView.as_view(), name='store-click'),
]

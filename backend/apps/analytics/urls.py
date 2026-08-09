from django.urls import path, include
from rest_framework.routers import SimpleRouter

from . import views

router = SimpleRouter()
router.register(r'clicks', views.JobClickViewSet, basename='jobclick')

urlpatterns = [
    path('', include(router.urls)),
]

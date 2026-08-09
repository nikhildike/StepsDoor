from django.urls import path, include
from rest_framework.routers import SimpleRouter

from . import views

router = SimpleRouter()
router.register(r'profiles', views.JobSeekerViewSet, basename='jobseeker')
router.register(r'saved-jobs', views.SavedJobViewSet, basename='savedjob')

urlpatterns = [
    path('', include(router.urls)),
]

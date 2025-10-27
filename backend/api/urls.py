from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    BatchViewSet,
    BagViewSet,
    FormViewSet,
    FormFieldViewSet,
    SubmissionViewSet,
    UserInfoView,
)

router = DefaultRouter()
router.register(r'batches', BatchViewSet, basename='batch')
router.register(r'bags', BagViewSet, basename='bag')
router.register(r'forms', FormViewSet, basename='form')
router.register(r'formfields', FormFieldViewSet, basename='formfield')
router.register(r'submissions', SubmissionViewSet, basename='submission')

urlpatterns = [
    path('', include(router.urls)),
    path('me/', UserInfoView.as_view(), name='user_info'),
]

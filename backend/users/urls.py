from django.urls import path, include
from rest_framework import routers
from . import views
from .views import RegisterUser

router = routers.DefaultRouter()
router.register(r'users', views.UserViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('verify-token/', views.verifyToken, name='verify-token'),
    path('register/', RegisterUser.as_view()),
]
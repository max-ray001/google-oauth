from .models import CustomUser
from .serializers import UserSerializer
from rest_framework import viewsets, permissions
from rest_framework.response import Response

class UserViewSet(viewsets.ModelViewSet):
    serializer_class = UserSerializer
    queryset = CustomUser.objects.all()
    permission_classes = [permissions.IsAuthenticated]
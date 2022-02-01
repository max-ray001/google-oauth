from .models import CustomUser
from django.db import transaction
from .serializers import RegisterUserSerializer, UserSerializer
from rest_framework import viewsets, permissions, generics, status
from rest_framework.response import Response

class UserViewSet(viewsets.ModelViewSet):
    serializer_class = UserSerializer
    queryset = CustomUser.objects.all()
    permission_classes = [permissions.IsAuthenticated]


class RegisterUser(generics.CreateAPIView):
    permission_classes = [permissions.AllowAny]
    queryset = CustomUser.objects.all()
    serializer_class = RegisterUserSerializer

    @transaction.atomic
    def post(self, request):
        serializer = RegisterUserSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
from rest_framework import serializers
from .models import CustomUser

class UserSerializer(serializers.HyperlinkedModelSerializer):
	class Meta:
		model = CustomUser
		fields = ['username', 'email',]

class RegisterUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ['id', 'username', 'email']
    
    def create(self, validated_data):
        username = validated_data['username']
        email = validated_data['email']
        return CustomUser.objects.create_user(username, email)
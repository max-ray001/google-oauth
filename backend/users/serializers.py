from rest_framework import serializers
from .models import CustomUser

class UserSerializer(serializers.HyperlinkedModelSerializer):
	class Meta:
		model = CustomUser
		fields = ['username', 'email', 'image_url']

class RegisterUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ['id', 'username', 'email', 'image_url']
    
    def create(self, validated_data):
        request_data = validated_data
        return CustomUser.objects.create_user(request_data)
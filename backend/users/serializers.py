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
        username = validated_data['username']
        email = validated_data['email']
        image_url = validated_data['image_url']
        return CustomUser.objects.create_user(username, email, image_url)
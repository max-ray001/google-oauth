from .models import CustomUser

def login_user(response, user=None, *args, **kwargs):

    if not user:
        email = response['email']
        username = response['name']
        login_user = CustomUser.objects.get(username=username, email=email)
        return {
            'is_new': False,
            'user': login_user
        }
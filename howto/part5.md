# Part5. ユーザ登録

## 1. カスタムユーザモデルを作る(Django)

DjangoデフォルトではUserを作成したときにusernameが必須項目になってしまうのですが、
GoogleログインやTwitterログインを使う際、usernameはバラバラの可能性が高いです
一方、emailはサービスによってコロコロ変わることはないですよね
なので、emailをusernameとして扱えるように、カスタムユーザモデルを作成します

- users app 作成

まず、カスタムユーザモデルを作成する用のappを作成します

```shell
$ python manage.py startapp users
```

- models.py

作成したusersのmodels.pyを作成していきます
※USERNAME_FIELDは、`email`にするとUNIQUE contraintのエラーが出てうまく動作しなかったので、usernameにしてます...

```py:users/models
from django.utils import timezone
from django.contrib.auth.models import AbstractBaseUser,PermissionsMixin

class CustomUser(AbstractBaseUser, PermissionsMixin):
	email = models.EmailField('email', null=True)
	username = models.CharField('username', unique=True, max_length=150)
	is_staff = models.BooleanField('is_staff', default=False)
	is_active = models.BooleanField('is_active', default=True)
	date_joined = models.DateTimeField('date_joined', default=timezone.now)

	objects=CustomUserManager()

	USERNAME_FIELD = 'username'
	EMAIL_FIELD = 'email'
	REQUIRED_FIELDS = ['email']

	class Meta:
		verbose_name = "user"
		verbose_name_plural = "users"
```

カスタムユーザモデルを使ってUserを作成するためにはカスタムユーザマネージャも必要です

```py:users/models.py
from django.contrib.auth.models import AbstractBaseUser,PermissionsMixin,BaseUserManager # ←追加

class CustomUserManager(BaseUserManager):
	
	use_in_migrations = True

	def _create_user(self, username, email, password, **extra_fields):
		if not email:
			raise ValueError('emailを入力してください')
		email = self.normalize_email(email)
		user = self.model(email=email, **extra_fields)
		user.set_password(password)
		user.save(using=self.db)
		return user

	def create_user(self, username, email, password=None, **extra_fields):
		extra_fields.setdefault('is_staff', False)
		extra_fields.setdefault('is_superuser', False)
		return self._create_user(username, email, password, **extra_fields)
	
	def create_superuser(self, username, email, password, **extra_fields):
		extra_fields.setdefault('is_staff', True)
		extra_fields.setdefault('is_superuser', True)
		if extra_fields.get('is_staff') is not True:
			raise ValueError('staff=Falseになっています')
		if extra_fields.get('is_superuser') is not True:
			raise ValueError('is_superuser=Falseになっています')
		return self._create_user(username, email, password, **extra_fields)

class User():
	# 略
```

- db削除→再度migration

最初に作ったsuperuserはデフォのUserクラスで作成されちゃっててもうどうしようもないので、
いったんDB削除して作成しなおす

```shell
$ rm -i db.sqlite3
```

再度migrate, superuser作成

```shell
$ python manage.py makemigrations
$ python manage.py migrate

$ python manage.py createsuperuser
Email: # ←Emailを要求されればカスタムユーザマネージャがしっかりつかえてる!
```

- drftoken再登録

DBを消しちゃったので、[part2](./part2.md#管理ページ)で作成した`Application`がなくなってます
**再作成して、.envファイルの変更を忘れず行いましょう**

- Adminサイトで確認できるようにする

ここで設定している内容については`django bros`で検索してください、、、

```py:users/admin.py
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.forms import UserChangeForm, UserCreationForm
from django.utils.translation import ugettext_lazy as _
from .models import CustomUser

class CustomUserChangeForm(UserChangeForm):
	class Meta:
		model = CustomUser
		fields = '__all__'

class CustomUserCreationForm(UserCreationForm):
	class Meta:
		model = CustomUser
		fields = ('username', 'email',)

class CustomUserAdmin(UserAdmin):
	fieldsets = (
		(None, {'fields': ('username', 'email', 'password')}),
		(_('Permissions'), {
			'fields': (
				'is_active',
				'is_staff',
				'is_superuser',
				'groups',
				'user_permissions'
			)
		}),
		(_('Important dates'), {'fields': ('last_login', 'date_joined')}),
	)

	add_fieldsets = (
		(None, {
			'classes': ('wide',),
			'fields': ('email', 'password', 'password2'),
		}),
	)

	change_form = CustomUserChangeForm
	add_form = CustomUserCreationForm
	list_display = ('username', 'email', 'is_staff')
	list_filter = ('is_staff', 'is_superuser', 'is_active', 'groups')
	search_fields = ('email',)
	ordering = ('email',)


admin.site.register(CustomUser, CustomUserAdmin)
```

## 2. Serializer & ViewSet を作成

DRFでユーザの操作(作成,変更,削除...)を行うにはSerializerクラス, ViewSetクラスを作成します
`users/`配下に`serializers.py`という名前のファイルを新規作成して、↓のように書きます

```py:users/serializers.py
from rest_framework import serializers
from .models import CustomUser

class UserSerializer(serializers.HyperlinkedModelSerializer):
	class Meta:
		model = CustomUser
		fields = ['username', 'email']
```

続いてviews.pyを↓の通り作成します

```py:users/views.py
from .models import CustomUser
from .serializers import UserSerializer
from rest_framework import viewsets, permissions

class UserViewSet(viewsets.ModelViewSet):
    serializer_class = UserSerializer
    queryset = CustomUser.objects.all()
    permission_classes = [permissions.IsAuthenticated] # ←注目
```

## 3. APIテスト

ここで、APIのテストをしてみます
`httpie`というHTTPクライアントを使ってHTTPリクエストをDRFに送ってみましょう

```sh
$ pip install httpie

$ http GET http://127.0.0.1:8000/users/
HTTP/1.1 401 Unauthorized
Allow: GET, POST, HEAD, OPTIONS
Content-Length: 55
Content-Type: application/json
Date: Tue, 01 Feb 2022 12:41:34 GMT
Referrer-Policy: same-origin
Server: WSGIServer/0.2 CPython/3.6.8
Vary: Accept, Origin
WWW-Authenticate: Bearer realm="api"
X-Content-Type-Options: nosniff
X-Frame-Options: DENY

{
    "detail": "認証情報が含まれていません。"
}
```

はい `401(Unauthorized)コード, 認証情報が含まれていません` と返ってきましたね

これはなぜかというと、
2.の`views.py`で、UserViewSetの`permission_class`を**IsAuthenticated**にしたためです
これは、UserViewSetに対して操作(GET, PUT, UPDATE, DELETE..)を行えるのが、`認証されたユーザのみ`ということになります

ではどうやって認証された状態でリクエストを送れるのか、、、
ここでpart3.で発行できるようになった`access_token`を使うわけですね！！

リクエストの`Authorization`ヘッダーに、Google認証→DRFトークン変換(convert-token)によって発行されたトークンをはっつけてリクエストを送ってみましょう
`Authorization: Bearer <access_token>` でヘッダーを付与できます

```sh
$ http GET http://127.0.0.1:8000/users/ "Authorization: Bearer AfjU7es3nWC8gjXNbDQiz3EbMOBUI6"

HTTP/1.1 200 OK
Allow: GET, POST, HEAD, OPTIONS
Content-Length: 161
Content-Type: application/json
Date: Tue, 01 Feb 2022 12:50:19 GMT
Referrer-Policy: same-origin
Server: WSGIServer/0.2 CPython/3.6.8
Vary: Accept, Origin
X-Content-Type-Options: nosniff
X-Frame-Options: DENY

[
    {
        "email": "hoge@gmail.com",
        "username": "c0ba1t_coke"
    }
]
```

![TestingAPI](./images/testing_api.png)

管理用に作成したユーザが返ってきたら成功です

## 4. ユーザ登録用エンドポイントを作成する

### URLの作成

ユーザ登録を行う際のAPIのURLを指定・作成します

```py:users/urls.py
from django.urls import path, include
from rest_framework import routers
from . import views
from .views import RegisterUser

router = routers.DefaultRouter()
router.register(r'users', views.UserViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('register/', RegisterUser.as_view()),
    path('api-auth/', include('rest_framework.urls', namespace='rest_framework')),
]
```

### Viewの作成

URLで指定したように、`RegisterUser`というViewを作成します
変更箇所が`#`です

```py:users/views.py
from .models import CustomUser
from django.db import transaction #
from .serializers import RegisterUserSerializer, UserSerializer #
from rest_framework import viewsets, permissions, generics, status #
from rest_framework.response import Response #

class UserViewSet(viewsets.ModelViewSet):
    ## 略

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
```

- permission_classes : ユーザ登録は承認されてない状態で行われるはずなので、AllowAnyにします
- generics : ViewSetより細かくメソッドを定義したい場合などはgenericsを使います 公式チュートリアル参照

### Serializerの作成

Viewで指定したように、`RegisterUserSerializer`というSerializerを作成します

```py:users/serializers.py
class RegisterUserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = CustomUser
        fields = ['id', 'username', 'email', 'password']
    
    def create(self, validated_data):
        return CustomUser.objects.create_user(request_data=validated_data)
```

viewで、`serializer.is_valid()`でserializerのデータが検証された後、
serializerのデータが返されます
返されたデータによってcreate_user関数が動き、ユーザ登録が済みます

### modelのcreate_user関数あたりを変更

基本的にReact-DRFを使ったAPIでユーザ作成を行っていくため、
フォームの入力内容を元にユーザを作成するUserManagerクラスだと不便になります

API経由ではusername,email,passwordといった情報は、
Serializerで指定したように`request_data`としてまとまって引数に来ることになります

なので、CustomUserManagerの引数と、引数から変数に値を入れる部分をrequest_dataに対応させます
変更箇所が`#`です

```py:users/models.py
class CustomUserManager(BaseUserManager):
	
	use_in_migrations = True

	def _create_user(self, request_data, **extra_fields): #
		if not request_data['email']:
			raise ValueError('emailを入力してください')
		email = self.normalize_email(request_data['email']) #
		user = self.model(username=request_data['username'], email=email, **extra_fields) #
		user.set_password(request_data['password'])
		user.save(using=self.db)
		return user

	def create_user(self, request_data, **extra_fields): #
		extra_fields.setdefault('is_staff', False)
		extra_fields.setdefault('is_superuser', False)
		return self._create_user(request_data, **extra_fields)
	
	def create_superuser(self, request_data, **extra_fields): #
		extra_fields.setdefault('is_staff', True)
		extra_fields.setdefault('is_superuser', True)
		if extra_fields.get('is_staff') is not True:
			raise ValueError('staff=Falseになっています')
		if extra_fields.get('is_superuser') is not True:
			raise ValueError('is_superuser=Falseになっています')
		return self._create_user(request_data, **extra_fields) #
```

### APIを試す

ここまで出来たらUser登録がhttpリクエストでできるようになるはずです！

```shell
$ http POST http://127.0.0.1:8000/register/ username="new_user100" email="atarashii@userdayo.com" password="helloworld"

HTTP/1.1 201 Created
Allow: POST, OPTIONS
Content-Length: 66
Content-Type: application/json
Date: Tue, 01 Feb 2022 16:34:26 GMT
Referrer-Policy: same-origin
Server: WSGIServer/0.2 CPython/3.6.8
Vary: Accept, Origin
X-Content-Type-Options: nosniff
X-Frame-Options: DENY

{
    "email": "atarashii@userdayo.com",
    "id": 7,
    "username": "new_user100"
}
```

201(created)レスポンスが返ってきましたね！ HTTPリクエストによる登録まではできました
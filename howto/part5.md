# Part5. ユーザ登録

## 0. 流れの理解

このパートの流れは以下の通りです。

1. カスタムユーザモデルの作成
2. Serializer,ViewSet作成

## 1. カスタムユーザモデルを作る(Django)

デフォルトのユーザモデルではユーザの画像のフィールドがないため、
カスタムユーザモデルを作成します

- users app 作成

まず、カスタムユーザモデルを作成するためのappを作成します

```shell
$ python manage.py startapp users
```

- models.py

作成したusersのmodels.pyを作成していきます
image_urlというフィールドを作成して、null=Trueにするか、defaultを設定します

```py:users/models
from django.utils import timezone
from django.contrib.auth.models import AbstractBaseUser,PermissionsMixin

class CustomUser(AbstractBaseUser, PermissionsMixin):
	email = models.EmailField('email', unique=True, null=True)
	username = models.CharField('username', unique=True, max_length=150)
	image_url = models.CharField('imageUrl', null=True, max_length=500)
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
※通常ユーザに関しては、認証をOAuthで行うことを前提としているのでパスワードの設定はないです

```py:users/models.py
class CustomUserManager(BaseUserManager):
	
	use_in_migrations = True

	def _create_user(self, username, email, image_url, **extra_fields):
		if not email:
			raise ValueError('emailを入力してください')
		if not username:
			raise ValueError('usernameを入力してください')
		email = self.normalize_email(email)
		user = self.model(username=username, email=email, image_url=image_url, **extra_fields)
		user.save(using=self.db)
		return user

	def create_user(self, username, email, image_url, **extra_fields):
		extra_fields.setdefault('is_staff', False)
		extra_fields.setdefault('is_superuser', False)
		return self._create_user(username, email, image_url, **extra_fields)
	
	def create_superuser(self, username, email, password, **extra_fields):
		extra_fields.setdefault('is_staff', True)
		extra_fields.setdefault('is_superuser', True)
		if extra_fields.get('is_staff') is not True:
			raise ValueError('staffがTrueではないです')
		if extra_fields.get('is_superuser') is not True:
			raise ValueError('is_superuserがTrueではないです')
		if not email:
			raise ValueError('emailを入力してください')
		if not username:
			raise ValueError('usernameを入力してください')
		email = self.normalize_email(email)
		user = self.model(username=username, email=email, **extra_fields)
		user.set_password(password)
		user.save(using=self.db)
		return user

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
```

- drftoken再登録

DBを消しちゃったので、[part2](./part2.md#管理ページ)で作成した`Application`がなくなってます
**再作成して、.envファイルの変更を忘れず行いましょう**

- (オプション)Adminサイトで確認できるようにする

DRFでは基本的にAPIを介してユーザの作成・変更・削除を行うことになるので、
adminへの登録は不要といえば不要です

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
		(None, {'fields': ('username', 'email', 'password', 'image_url')}),
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
			'fields': ('username', 'email', 'password1', 'password2'),
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

## 2. Serializer & ViewSet & url を作成

DRFでユーザの操作(作成,変更,削除...)を行うにはSerializerクラス, ViewSetクラスを作成します
`users/`配下に`serializers.py`という名前のファイルを新規作成して、↓のように書きます

```py:users/serializers.py
from rest_framework import serializers
from .models import CustomUser

class UserSerializer(serializers.HyperlinkedModelSerializer):
	class Meta:
		model = CustomUser
		fields = ['username', 'email', 'image_url']
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

urlはDRFのRouterを使います

```py:usrs/urls.py
from django.urls import path, include
from rest_framework import routers #
from . import views

router = routers.DefaultRouter() #
router.register(r'users', views.UserViewSet) #

urlpatterns = [
    path('', include(router.urls)),
]
```

### APIテスト

APIのテストしてみます

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
UserViewSetの`permission_class`を**IsAuthenticated**にしたためです
part4ではさらっと飛ばしちゃいましたが、
これは、UserViewSetに対して操作(GET, PUT, UPDATE, DELETE..)を行えるのが、`認証されたユーザのみ`ということになります

ではどうやって認証された状態でリクエストを送れるのか、、、
ここでpart3で発行できるようになった`access_token`を使うわけですね！！

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

## 3. ユーザ登録用エンドポイントを作成する

### URLの作成

ユーザ登録を行う際のAPIのURLを指定・作成します

```py:users/urls.py
from django.urls import path, include
from rest_framework import routers
from . import views
from .views import RegisterUser #

router = routers.DefaultRouter()
router.register(r'users', views.UserViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('register/', RegisterUser.as_view()), #
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
    class Meta:
        model = CustomUser
        fields = ['id', 'username', 'email', 'image_url']
    
    def create(self, validated_data):
        username = validated_data['username']
        email = validated_data['email']
        image_url = validated_data['image_url']
        return CustomUser.objects.create_user(username, email, image_url)
```

viewで、`serializer.is_valid()`でserializerのデータが検証された後、
serializerのデータが返されます
返されたデータによってcreate_user関数が動き、ユーザ登録が実行されます

登録関連の機能は[こちらの記事](https://qiita.com/xKxAxKx/items/60e8fb93d6bbeebcf065)で紹介されているものを参考にさせてもらいました

### APIを試す

ここまで出来たらUser登録がhttpリクエストでできるようになるはずです！

```shell
$ http POST http://127.0.0.1:8000/register/ username="new_user114514" email="tadokoro@swimclub.com" image_url="https://lh3.googleusercontent.com/happinesskiss.png"

HTTP/1.1 201 Created
Allow: POST, OPTIONS
Content-Length: 135
Content-Type: application/json
Date: Sat, 05 Feb 2022 22:04:40 GMT
Referrer-Policy: same-origin
Server: WSGIServer/0.2 CPython/3.6.8
Vary: Accept, Origin
X-Content-Type-Options: nosniff
X-Frame-Options: DENY

{
    "email": "tadokoro@swimclub.com",
    "id": 20,
    "image_url": "https://lh3.googleusercontent.com/happinesskiss.png",
    "username": "new_user114514"
}
```

201(created)レスポンスが返ってきましたね！ HTTPリクエストによる登録まではできました


## 4. フロントでAPIを叩く

フロントの関数を作っていきます フローは以下の通りです

`ボタン押す`
→`Google認証情報が返ってくる`
→`tokenIdをデコード`
→`登録エンドポイントを叩く`
→`Google認証の中のaccessTokenをaccess_tokenに変換する`
→`デコードされた情報とaccess_tokenを元にユーザデータを返すエンドポイントを叩く`
→`フロントでユーザ情報を表示`

### ボタンとボタンを押したときの処理作成

少しずつ作っていきましょう
まずはボタンを表示します

```js:App.js
	const handleGoogleSignIn = async (googleData) => {
		console.log(googleData)
	}

  return (
    <div className="App">
      <header className="App-header">
        <h1>Google OAuth Test</h1>
				{
					userGoogleData ? (
						<div>
							<h2>Hello, {userGoogleData.name} ({userGoogleData.email}) !</h2>
							<img src={userGoogleData.picture} />
						</div>
					) : (
						<div>
							<GoogleLogin
								clientId={googleClientId}
								buttonText="Googleアカウントでログイン"
								onSuccess={(response) => handleGoogleLogin(response)}
								onFailure={(err) => console.log("Google Login failed", err)}
							/>
							<hr/>
							<GoogleLogin
								clientId={googleClientId}
								buttonText="Googleアカウントで登録"
								onSuccess={(response) => handleGoogleSignIn(response)}
								onFailure={(err) => console.log("Google SignIn failed.", err)}
							/>
						</div>
					)
				}
      </header>
    </div>
  );
}
```

### デコード

ボタンができたら、ユーザのGoogleデータをデコードしてユーザ名とメールアドレス、プロフ画像を拝借します

```js:App.js
	const handleGoogleSignIn = async (googleData) => {
		console.log(googleData)
    const googleToken = googleData
    const user_data = await verifyToken(googleToken)
    console.log(user_data)
	}
```

ログインと同じですね

ただ、[part4](./part4.md)の時はaccess_tokenを取得してからverifyTokenを実行していましたが、
今回は順序が逆なので、permissionを`IsAuthenticated`にしていると認証できずにviewを実行できません

verifyTokenのpermissionは`AllowAny`に変更します

```py:backend/users/views.py
@api_view(['POST'])
@permission_classes([permissions.AllowAny]) #
def verifyToken(request):
    req = requests.Request()
    token = request.data['tokenId']
    audience = config("SOCIAL_AUTH_GOOGLE_OAUTH2_KEY")
    user_google_info = id_token.verify_oauth2_token(token, req, audience)
    return Response(user_google_info, status=status.HTTP_200_OK)
```

この状態で登録ボタンを押してみます

user_dataが返ってくるので、この情報をもとに/registerで登録を行います

### 登録エンドポイントを叩く

App()内に関数(registerUser)を追加します

```js:App.js
  const registerUser = async (user_data) => {
    console.log(user_data)
    const username = user_data['name']
    const email = user_data['email']
    const image_url = user_data['picture']
    console.log(username, email, image_url)
    return await axios
      .post(`${baseURL}/register/`, {
          username: username,
          email: email,
          image_url: image_url
        },
      )
      .then((res) => {
        return res
      })
      .catch((err) => {
        console.log("Error Regigster User", err)
      })
  }

	const handleGoogleLogin = async (response) => {
		// 略
	}

	const handleGoogleSignIn = async (googleData) => {
	  console.log(googleData)
      const googleToken = googleData
      const user_data = await verifyToken(googleToken)
      const status = await registerUser(user_data)
      console.log(status)
	}
```

これでGoogle認証→tokenデコード→ユーザ登録まで完了します
エラーですに201CREATEDが返ってくることが確認出来たら、adminサイトでもユーザが作成されているか確認してみてください

### ログインでも登録できてしまう！？

登録ボタンを作りましたが、実は以前作ったログインボタンでもユーザ登録ができてしまいます

これに関しては、[part1](./part1.md)で`settings.py`に設定した`drf_social_oauth2`が関係してきます

[drf_social_oauth2](https://github.com/wagnerdelima/drf-social-oauth2)は[python social auth](https://python-social-auth.readthedocs.io/en/latest/)を継承しており、
その`python social auth`の`pipeline`という機能で、ユーザの新規登録がデフォルトで備わっています

今回は自前でカスタムユーザを作ってそちらで処理したいので、
この機能は設定を切っておきましょう
↓のように`settings.py`に追加することで設定をオーバーライドできます

```py:settings.py
# Python Social Auth 設定のオーバーライド

SOCIAL_AUTH_PIPELINE = (
    'social_core.pipeline.social_auth.social_details',
    'social_core.pipeline.social_auth.social_uid',
    'social_core.pipeline.social_auth.auth_allowed',
    'social_core.pipeline.social_auth.social_user',
    # 'social_core.pipeline.user.get_username',
    # 'social_core.pipeline.user.create_user',
    'social_core.pipeline.social_auth.associate_user',
    'social_core.pipeline.social_auth.load_extra_data',
    'social_core.pipeline.user.user_details',
)
```

`get_username`,`create_user`のメソッドをコメントアウトすることでユーザ登録機能をスキップできます

- 参考 :
  - [DjangoでGoogleログイン認証【メールバリデーション編】](https://tsukasa-blog.com/programming/social-django-email-validation/)
  - [Pipeline-PythonSocialAuthDocumentation](https://python-social-auth.readthedocs.io/en/latest/pipeline.html)

### ユーザ情報表示
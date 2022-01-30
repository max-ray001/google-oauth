# Part4. ユーザ登録、ユーザ情報表示、ログアウト

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

```py:users/models
from django.utils import timezone
from django.contrib.auth.models import AbstractBaseUser,PermissionsMixin

class User(AbstractBaseUser, PermissionsMixin):
	email = models.EmailField('email', unique=True)
	username = models.CharField('username', max_length=150)
	is_staff = models.BooleanField('is_staff', default=False)
	is_active = models.BooleanField('is_active', default=True)
	date_joined = models.DateTimeField('date_joined', default=timezone.now)

	objects=CustomUserManager()

	USERNAME_FIELD = 'email'
	EMAIL_FIELD = 'email'
	REQUIRED_FIELDS = []

	class Meta:
		verbose_name = "user"
		verbose_name_plural = "users"
```

カスタムユーザモデルを使ってUserを作成するためにはカスタムユーザマネージャも必要です

```py:users/models.py
from django.contrib.auth.models import AbstractBaseUser,PermissionsMixin,BaseUserManager # ←追加

class CustomUserManager(BaseUserManager):
	
	use_in_migrations = True

	def _create_user(self, email, password, **extra_fields):
		if not email:
			raise ValueError('emailを入力してください')
		email = self.normalize_email(email)
		user = self.model(email=email, **extra_fields)
		user.set_password(password)
		user.save(using=self.db)
		return user

	def create_user(self, email, password=None, **extra_fields):
		extra_fields.setdefault('is_staff', False)
		extra_fields.setdefault('is_superuser', False)
		return self._create_user(email, password, **extra_fields)
	
	def create_superuser(self, email, password, **extra_fields):
		extra_fields.setdefault('is_staff', True)
		extra_fields.setdefault('is_superuser', True)
		if extra_fields.get('is_staff') is not True:
			raise ValueError('staff=Falseになっています')
		if extra_fields.get('is_superuser') is not True:
			raise ValueError('is_superuser=Falseになっています')
		return self._create_user(email, password, **extra_fields)

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
		fields = ('email',)

class CustomUserAdmin(UserAdmin):
	fieldsets = (
		(None, {'fields': ('email', 'password')}),
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
	list_display = ('email', 'is_staff')
	list_filter = ('is_staff', 'is_superuser', 'is_active', 'groups')
	search_fields = ('email',)
	ordering = ('email',)


admin.site.register(CustomUser, CustomUserAdmin)
```

## 2. Serializerを作成

DRFでユーザの操作(作成,変更,削除...)を行うにはSerializerクラスを作成します

```py:users/serializers.py
from rest_framework import serializers
from .models import CustomUser

class UserCreationSerializer(serializers.ModelSerializer):
	class Meta:
		model = CustomUser
		fields = ('email', 'password')
		extra_kwargs={'password':{'write_only':True}}

	def create(self, validated_data):
		password = validated_data.pop('password', None)
		new_user = self.Meta.model(**validated_data)
		if password is not None:
			new_user.set_password(password)
		new_user.save()
		return new_user
```
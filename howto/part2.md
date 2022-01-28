# Part2. Django設定

## 1. 仮想環境作成

```shell
$ python -m venv tutorial
$ source tutorial/bin/activate
$ pip install --upgrade pip
```

## 2. 必要ライブラリインストール

- requirements.txtに記入

```shell
$ vi requirements.txt
```

```txt:requirements.txt
django
djangorestframework
drf_social_oauth2
python-decouple
django-cors-headers
```

- install実行

```shell
$ pip install -r requirements.txt

$ pip list
Package                Version
---------------------- --------
Deprecated             1.2.13
Django                 3.2.11
django-cors-headers    3.10.1
django-oauth-toolkit   1.7.0
djangorestframework    3.13.1
drf-social-oauth2      1.2.1
python-decouple        3.5
```

## 3. プロジェクト作成

```shell
$ django-admin startproject backend
$ cd backend
```

## 4. プロジェクト設定

- INSTALLED_APPS に ライブラリを追加

```py:backend/settings.py
# Application definition

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # 以下追加
    'rest_framework',
    'drf_social_oauth2',
    'social_django',
    'oauth2_provider',
    'corsgheaders',
]
```

- MIDDLEWARE にも追加

```py:backend/settings.py
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',

    # 以下追加
    'corsheaders.middleware.CorsMiddleware',
]
```

- CORS 設定追記

```py:backend/settings.py
# React との CORS の設定

CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000" # Reactはport:3000を利用
]
```

- TEMPLATES を以下の通り追加

```py:backend/settings.py
TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',

                # 以下追加
                'social_django.context_processors.backends',
                'social_django.context_processors.login_redirect',
            ],
        },
    },
]
```

- REST framework 設定を追加

```py:backend/settings.py
# REST framework 設定

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'oauth2_provider.contrib.rest_framework.OAuth2Authentication',
        'drf_social_oauth2.authentication.SocialAuthentication',
    ),
}

AUTHENTICATION_BACKENDS = (
    'drf_social_oauth2.backends.DjangoOAuth2',
    'django.contrib.auth.backends.ModelBackend',
)
```

- さらに、Google OAuth 関連設定追加

```py:backend/settings.py
# decouple から config をインポート
from decouple import config

# Google から取得した鍵情報

SOCIAL_AUTH_GOOGLE_OAUTH2_KEY = config("SOCIAL_AUTH_GOOGLE_OAUTH2_KEY")
SOCIAL_AUTH_GOOGLE_OAUTH2_SECRET = config("SOCIAL_AUTH_GOOGLE_OAUTH2_SECRET")

# アクセススコープの設定

SOCIAL_AUTH_GOOGLE_OAUTH2_SCOPE = [
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
]
```

## 5. 変数設定ファイル作成

```shell:backend
$ vi .env
```

```:.env
SOCIAL_AUTH_GOOGLE_OAUTH2_KEY=""
SOCIAL_AUTH_GOOGLE_OAUTH2_SECRET=""
```
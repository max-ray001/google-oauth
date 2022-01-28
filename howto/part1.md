# Part1. Django設定

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
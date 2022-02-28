<div align="center">

# 【絶対にできる！】Googleログインボタンの実装【React × Django REST Framework】

![Google_Login_GIF_demo](./howto/images/google_login_demo.gif)

React × Django REST Framework で Googleログインボタンを実装するチュートリアルです

Socialログインボタンの具体的な作例を通じて、サードパーティ認証(OIDC)に関して理解を深めることができます

</div>

## 対象

この記事は下記のような方々に役に立つと思います

- `React`でソーシャルログインボタンの実装を試してみたい方
- `Django REST Framework`で`REST API`の使い方を学びたい方
- `JSON Web Token (JWT)`について理解したい方
- `OpenID Connect (OIDC)`について理解したい方
- `HTTPリクエストヘッダー`について理解したい方

というのもこの記事とデモアプリの作成過程で
僕自身 理解が深まったと感じたためです

## howto

実際の手順については`howto/`ディレクトリ配下にmdファイルを用意したので
part1から順番にご覧になってください

## 環境

本記事のデモアプリは下記の環境で構築しました

- Google Compute Engine
  - Rocky Linux 8.4
- VSCode + RemoteSSHプラグイン

## ミドルウェアバージョン

### バックエンド

| Name                | Version |
| ------------------- | ------- |
| Django              | 3.2.11  |
| djangorestframework | 3.13.1  |
| django-cors-headers | 3.10.1  |
| drf-social-oauth2   | 1.2.1   |
| python-decouple     | 3.5     |

### フロントエンド

| Name | Version |
| ---- | ------- |
| node | 17.4.0  |
| npm  | 8.3.1   |
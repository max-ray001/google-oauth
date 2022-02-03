# ログイン→ユーザ情報表示 (React)

## 1. convert-token にPOSTを行う部分を切り抜く

```js:App.js
function App() {

  const convertToken = async (googleData) => {
		const token = googleData.accessToken
		return await axios
			.post(`${baseURL}/auth/convert-token`, {
				token: token,
				backend: "google-oauth2",
				grant_type: "convert_token",
				client_id: drfClientId,
				client_secret: drfClientSecret,
			})
			.then((res) => {
				const { access_token, refresh_token } = res.data;
				localStorage.setItem("access_token", access_token);
				localStorage.setItem("refresh_token", refresh_token);
				return access_token
			})
			.catch((err) => {
				console.log("Error Google Login", err);
			})
	}

	const handleGoogleLogin = (response) => {

	}

  return (
    // 略
  );
}
```

分かりやすいようにconvert-tokenをPOSTする部分を関数として切り出します

関数の返り値として、drfで発行した`access_token`を返したいので、
axios の前に `return` また、.thenで実行される関数でも `return access_token`とします
これで、convertToken()の返り値が `access_token` になります

- 参考:
  - [axiosでレスポンスを返すメソッドを作成したがコンポーネント側でうまく使用できない](https://teratail.com/questions/235618)
  - [async/awaitで非同期処理させた結果を返り値としてreturnしたい]https://qiita.com/HorikawaTokiya/items/9822ba5af62b2ba92987)


## 2. tokenId(jwt)を検証・デコードする関数作成 (Django REST Framework)

GoogleOAuthで入手したJWTを検証したりデコードしたりするのに便利なライブラリ、
[google-auth](https://google-auth.readthedocs.io/en/master/index.html)をインストールします

```shell
$ pip install --upgrade google-auth
```

### View関数作成

```py:views.py
from rest_framework.decorators import api_view, permission_classes
from google.oauth2 import id_token
from google.auth.transport import requests
from decouple import config

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def verifyToken(request):
    req = requests.Request()
    token = request.data['tokenId']
    audience = config("SOCIAL_AUTH_GOOGLE_OAUTH2_KEY")
    user_google_info = id_token.verify_oauth2_token(token, req, audience)
    return Response(user_google_info)
```

先ほどインストールした`google-auth`を使って検証&デコード処理を作ります

- @api_view(['POST']) : 関数をAPIとして扱うためのデコレータです drfの機能
- @permission_classes : api_viewでパーミッションの指定ができるようになるデコレータ

- token = request.data['tokenId'] : 後でフロントでHTTPリクエストをたたく処理を作るときに、リクエストボディに`tokenId`を入れるようにします

- id_token.verify_oauth2_token(token, request, audience) : この処理の核の部分です 第1引数のトークンを検証し、デコードしてくれます
  - token : JWTトークンが入ります String
  - request : [公式](https://google-auth.readthedocs.io/en/master/reference/google.oauth2.id_token.html)によると`google-auth`が様々なHTTPクライアントを受け付けるために必要みたいです
  - audience : GCPで発行したOAuth2のClient_IDのことです

- return Response(user_google_info) : ついに丸裸になったデータをフロントに返します

### URL登録

作ったViewにURLを振ります

```py:/users/urls.py
from django.urls import path, include
from rest_framework import routers
from . import views
from .views import RegisterUser

router = routers.DefaultRouter()
router.register(r'users', views.UserViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('verify-token/', views.verifyToken, name='verify-token'), # 追加
    path('api-auth/', include('rest_framework.urls', namespace='rest_framework')),
]
```

### APIテスト

ここで、APIのテストをしてみます
`httpie`というHTTPクライアントを使ってHTTPリクエストをDRFに送ってみましょう

まずはhttpieをインストール

```sh
$ pip install httpie
```

[part3](./part3.md)で発行した、googleToken(Iw から始まるjson)の中にある`tokenId`と、
同じくgoogleTokenの中にあるaccessTokenが、DRFによって変換された値である`access_token`
この2つをリクエストに含めて、さっき作ったViewにPOSTすると、
tokenId(jwt)をデコードしたものがレスポンスで返ってきます

```sh
$ tokenId="tokenIdをコピペしてください"

$ http POST http://127.0.0.1:8000/verify-token/ "Authorization: Bearer <ここにaccess_tokenをコピペ>" tokenId=${tokenId}

HTTP/1.1 200 OK
Allow: OPTIONS, POST
Content-Length: 567
Content-Type: application/json
Date: Thu, 03 Feb 2022 16:00:55 GMT
Referrer-Policy: same-origin
Server: WSGIServer/0.2 CPython/3.6.8
Vary: Accept, Origin
X-Content-Type-Options: nosniff
X-Frame-Options: DENY

{
    "at_hash": "01Uh~~",
    "aud": "4990~~.apps.googleusercontent.com",
    "azp": "4990~~.apps.googleusercontent.com",
    "email": "youremailaddress@gmail.com",
    "email_verified": true,
    "exp": 1643907574,
    "family_name": "Family name",
    "given_name": "Given name",
    "iat": 1643903974,
    "iss": "accounts.google.com",
    "jti": "ec1824~~~",
    "locale": "ja",
    "name": "Your Name",
    "picture": "https://lh3.googleusercontent.com/~~~~~",
    "sub": "103796~~~~"
}
```

こんな感じでデータが返ってきたらOKです！

- http
  - POST : POSTを明示してリクエストを送信します つけないと、GETで送られてしまいます
  - verify-token/ : 最後に`/(スラッシュ)`を入れないとエラーが起こってしまいます このあたり自動で保管してほしいがやり方が分からない、、
  - "Authorization: Bearer tokenId" : リクエストのヘッダとして、Authorizationヘッダを付加します
  - tokenId : このtokenIdはリクエストのボディとして送信します

### MIDDLE_WARE 修正

この後フロントからAPIをたたく関数を作るのですが、
corsheadersのMiddlewareがdjangoのCommonMiddlewareより下にあるとCORS設定がうまく動かなくなるため、
上に持ってきましょう(上過ぎてもだめらしいのでcommonをcorsheaderの下に持ってきました)

```py:settings.py
    # installed library
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
```

## 3. フロントからAPIをたたく (React)

先ほどは`httpie`を使って情報を取得しましたが、
同じような処理をする関数をフロントに作成します

```js:App.js
import { useState } from 'react';

function App() {
	const [ userGoogleData , setUserGoogleData ] = useState("");

  const convertToken = async (googleData) => {
		// 略
	}

	const verifyToken = async (googleToken, drfToken) => {
		const token = googleToken.tokenId
		return await axios
      .post(`${baseURL}/verify-token/`,
				{ tokenId: token },
				{ headers: { Authorization: `Bearer ${drfToken}` } }
			)
			.then((res) => {
				const user_google_info = res.data
				return user_google_info
			})
			.catch((err) => {
				console.log("Error Verify Token", err)
			})
	}

	const handleGoogleLogin = async (response) => {
		const googleToken = response
		const drfAccessToken = await convertToken(googleToken)
		const user_data = await verifyToken(googleToken, drfAccessToken)
		setUserGoogleData(user_data)
		console.log(user_data)
	}

  return (
		// 略
```

- useState : jwtをデコードしたデータをステートで保管します

- verifyToken :
  - この関数は引数が2つ必要です
    - 1つは、Google認証で発行したデータの中にある`tokenId` → リクエストボディに付与します
    - もう一つは、convert-tokenで発行された`access_token`です → Authorizationヘッダに付与します
  - const token = googleToken.tokenId : `tokenId`の値を変数に入れます
  - axios :
    - .post : axiosのpostで、/verify-token/を叩きます ボディに`tokenId`、ヘッダに`Authorization`の情報を付与してPOSTします
    - .then : APIが正常に値を返して来たら、responseデータをuser_google_info変数に格納します
  - convertTokenの時と同様、await と user_google_info の前に`return`を付けます

- handleGoogleLogin :
  - convertTokenとverifyTokenでログイン処理が行えるようになります
  - handleGoogleLoginはasync/awaitを使って、処理順を指定します convertToken→verifyTokenの順じゃないとうまくいかないはずなので
  - verifyTokenが完了して返ってきた値はステート`userGoogleData`として保存します

これで実際にReact起動して、ログインボタンを押してみます

Google認証を経て、コンソールに`userGoogleData`のJSONが表示されれば成功！


## 3. ユーザ情報画面表示

ログイン処理ができたので、ユーザ情報を表示してあげましょう

```js:App.js
function App() {
	const [ userGoogleData , setUserGoogleData ] = useState("");

  const convertToken = async (googleData) => {
		// 略
	}

	const verifyToken = async (googleToken, drfToken) => {
		// 略
	}

	const handleGoogleLogin = async (response) => {
		const googleToken = response
		const drfAccessToken = await convertToken(googleToken)
		const user_data = await verifyToken(googleToken, drfAccessToken)
		setUserGoogleData(user_data)
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
						<GoogleLogin
							clientId={googleClientId}
							buttonText="Googleアカウントでログイン"
							onSuccess={(response) => handleGoogleLogin(response)}
							onFailure={(err) => console.log("Google Login failed", err)}
						></GoogleLogin>
					)
				}
      </header>
    </div>
  );
}

export default App;
```

ステート`userGoogleData`の中身があるかどうかで分岐させます
`{ userGoogleData ? ( ある時の処理 ) : ( ない時の処理 ) }`で表示切替できます

ステートの中身がない、つまり未ログインの場合は、<GoogleLogin>ボタンを表示させます
ステートの中身がある、つまりログイン済の場会は、ユーザ名とemail、ユーザのGoogleの登録画像を表示させます

# 完了

お疲れ様でした！ログイン処理完了です
[次のパート](./part5.md)ではユーザ登録を作っていきます


余談ですが、
axiosとかstateに全く慣れてなく、この機能実装するのに1週間くらいかかりました、、
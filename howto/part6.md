# part6. ユーザ情報表示

## 0. 流れの理解

このパートの流れは以下の通りです。

1. カスタムユーザモデルの作成

## 1. ユーザ情報を返す関数を作成する(DRF)

ユーザ登録後の処理フローを確認します  
前パートのユーザ登録フローを含めて以下のような感じになります

ボタン押す  
→`Google認証情報が返ってくる`  
→tokenIdをデコード  
→登録エンドポイントを叩く  
→`Google認証の中のaccessTokenをaccess_tokenに変換する`  
→`access_tokenを元にユーザデータを返すエンドポイントを叩く`  
→`フロントでユーザ情報を表示`  

ではDjangoDBに保存されているユーザ情報を取得する関数を作成します  
views.pyを開いて以下の関数を作成します

```py:users/views.py
from rest_framework.views import APIView

class GetUserDetail(APIView):
    permission_classes = [permissions.IsAuthenticated,]
    def  get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)
```

認証トークンを保持したリクエストユーザに対し、そのユーザのシリアライザーデータを返す関数です

関数に対するurlを作成します

```py
from django.urls import path, include
from rest_framework import routers
from . import views
from .views import RegisterUser, GetUserDetail # 追加

router = routers.DefaultRouter()
router.register(r'users', views.UserViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('verify-token/', views.verifyToken, name='verify-token'),
    path('register/', RegisterUser.as_view()),
    path('get-user-detail/', GetUserDetail.as_view()), # 追加
]
```

これで、get-user-detail/ に対して、Authorizationヘッダにトークンを付与して送るとそのリクエストユーザのデータが返ってきます  
httpieで確認してみましょう

```shell
$ http GET http://127.0.0.1:8000/get-user-detail/ "Authorization: Bearer <tokenId>"
HTTP/1.1 200 OK
Allow: GET, HEAD, OPTIONS
Content-Length: 161
Content-Type: application/json
Date: Wed, 16 Feb 2022 12:32:53 GMT
Referrer-Policy: same-origin
Server: WSGIServer/0.2 CPython/3.6.8
Vary: Accept, Origin
X-Content-Type-Options: nosniff
X-Frame-Options: DENY

{
    "email": "hogehoge@gmail.com",
    "image_url": "https://lh3.googleusercontent.com/a-/~~~~~~",
    "username": "Family Given"
}
```

part4などで作成したユーザで試してみてください

## 2. ユーザ情報をリクエストする関数を作成する(React)

お次はフロントで先ほど作ったAPIを叩く関数を作成します

```js:App.js
	const [ userDetail, setUserDetail ] = useState("");

  const getUserDetail = async (accessToken) => {
    const token = accessToken
    return await axios
      .get(`${baseURL}/get-user-detail/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        }
      })
      .then((res) => {
        const { username, email, image_url } = res.data;
        return { username, email, image_url }
      })
      .catch((err) => {
        console.log("Error Get User Detail", err)
      })
  }

  const handleGoogleSignUp = async (googleData) => {
		console.log(googleData)

		// Googleユーザのjwtをデコードする
    const userJWT = googleData.tokenId
    const userVerifiedData = await verifyToken(userJWT)
    
		// デコードされたデータでユーザ登録を行う
		const userRegisteredData = await registerUser(userVerifiedData)

		console.log(userRegisteredData)

		// 新規登録されたユーザのGoogle:accessTokenをconvertする
		const userAccessToken = googleData.accessToken
		const drfAccessToken = await convertToken(userAccessToken)

		console.log(drfAccessToken)

		// drfAccessTokenを使ってユーザデータ表示
		const userDetail = await getUserDetail(drfAccessToken)
		console.log(userDetail)
		setUserDetail(userDetail)
	}
```

- const [ userDetail, setUserDetail ] = useState(""); : ステートを初期化

- getUserDetail:
  - axios.get:
    - { headers: { Authorization: `Bearer ${token}` }} : token情報をAuthorizationヘッダに付与するにはこのように書きます
  - .then:
    - resにSerializerデータがレスポンスとして入っているので、その中のusername, email, image_url変数に格納します
    - return で返します

- handleGoogleSignUp : ログインボタンを押したときの処理
  - userDetail = await getUserDetail(drfAccessToken) : convert-tokenによって取得したaccessTokenを渡してgetUserDetail関数を実行します
  - username, email, imaga_urlが返ってきているので、それらをUserDetailステートに保存します

表示部分は↓の通り変更します

```js:App.js
  return (
    <div className="App">
      <header className="App-header">
        <h1>Google OAuth Test</h1>
				{
					userDetail ? (
						<div>
							<h2>Hello, {userDetail.username} ({userDetail.email}) !</h2>
							<img src={userDetail.image_url} />
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
								onSuccess={(response) => handleGoogleSignUp(response)}
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

## 4. ログイン時の挙動も合わせる

最後に、ログインボタンを押したときの挙動を合わせます

今のところ、googleTokenをデコードした内容をそのまま表示しているので、  
ちゃんとgetUserDetailを実行して取得した値で表示するように変更します

```js:App.js
const handleGoogleLogin = async (googleData) => {

  // ユーザのGoogle:accessTokenをconvertする
  const userAccessToken = googleData.accessToken
  const drfAccessToken = await convertToken(userAccessToken)

  // drfAccessTokenを使ってユーザデータ表示
  const userDetail = await getUserDetail(drfAccessToken)

  // ステート更新
  setUserDetail(userDetail)
}
```

ログイン時は、convert-tokenで取得したaccessTokenによってユーザ認証が取れているので、  
verifyTokenを実行する必要がないです

## 5. ユーザ情報を保存

新規登録、ログインまで完成しましたね

今のところブラウザを更新するとデータが蒸発してログイン画面に戻ってしまうので、  
ローカルストレージにデータを保存するようにします

- stateの初期値を修正

```js:App.js
function App() {
	const [ userDetail, setUserDetail ] = useState(
		localStorage.getItem('userDetail')
		 	? JSON.parse(localStorage.getItem('userDetail'))
		 	: null
	);

...
```

ローカルストレージの中身を見て、値があればそれをuserDetailの初期値として設定します  
無ければ、nullで初期化します

- login,logout処理時にlocalStorageに値を保存

```js:App.js
	const handleGoogleLogin = async (googleData) => {

		// ユーザのGoogle:accessTokenをconvertする
		const userAccessToken = googleData.accessToken
		const drfAccessToken = await convertToken(userAccessToken)

		// drfAccessTokenを使ってユーザデータ表示
		const userDetail = await getUserDetail(drfAccessToken)

		// ステート更新
		setUserDetail(userDetail)

		// LocalStorageに保存
		localStorage.setItem('userDetail', JSON.stringify(userDetail)) // 追加
	}

	const handleGoogleSignUp = async (googleData) => {
 
		// Googleユーザのjwtをデコードする
    const userJWT = googleData.tokenId
    const userVerifiedData = await verifyToken(userJWT)
    
		// デコードされたデータでユーザ登録を行う
		const userRegisteredData = await registerUser(userVerifiedData)

		// 新規登録されたユーザのGoogle:accessTokenをconvertする
		const userAccessToken = googleData.accessToken
		const drfAccessToken = await convertToken(userAccessToken)

		// drfAccessTokenを使ってユーザデータ表示
		const userDetail = await getUserDetail(drfAccessToken)
		
		// ステート更新
		setUserDetail(userDetail)

		// LocalStorageに保存
		localStorage.setItem('userDetail', JSON.stringify(userDetail)) // 追加
	}

	const handleLogout = () => {
		localStorage.removeItem('userDetail')
		setUserDetail(null)
	}
```

これで更新ボタンを押してもログイン状態が維持できるようになりました！

## 5. ログアウト処理の作成

最後にログアウトボタンを作成します

保存していたステートとlocalstorageを削除するボタンを追加するだけです

```js:App.js
	const handleLogout = () => {
		localStorage.removeItem('userDetail')
		setUserDetail(null)
	}

  return (
    <div className="App">
      <header className="App-header">
        <h1>Google OAuth Test</h1>
				{
					userDetail ? (
						<div>
							<h2>Hello, {userDetail.username} ({userDetail.email}) !</h2>
							<img src={userDetail.image_url} /><br/>
							<button onClick={handleLogout}>ログアウト</button>
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
								onSuccess={(response) => handleGoogleSignUp(response)}
								onFailure={(err) => console.log("Google SignIn failed.", err)}
							/>
						</div>
					)
				}
      </header>
    </div>
  );
```

ついに完成、、、！！！

# part6 終了

お疲れさまでした  
これにてGoogle登録・ログインボタンのチュートリアルは終了となります

まだまだ開発しなければならない点も残ってますが、  
(トークンの有効期限処理や登録・ログイン周りのエラーハンドリング)  
Googleログインボタンの作成自体の解説と遠ざかっていくため、ここで解説は終わりにしようかなと思います

ここまで読んでくださりありがとうございます  
開発の参考になれば大変幸いです
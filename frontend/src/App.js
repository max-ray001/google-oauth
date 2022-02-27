import './App.css';

// ライブラリインポート
import GoogleLogin from "react-google-login";
import axios from "axios";
import { useState } from 'react';

// .env情報取得
const googleClientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
const drfClientId = process.env.REACT_APP_DRF_CLIENT_ID;
const drfClientSecret = process.env.REACT_APP_DRF_CLIENT_RECRET;
const baseURL = "http://localhost:8000";

function App() {
	const [ userDetail, setUserDetail ] = useState(
		localStorage.getItem('userDetail')
		 	? JSON.parse(localStorage.getItem('userDetail'))
		 	: null
	);

  const convertToken = async (userAccessToken) => {
		const token = userAccessToken
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

  const verifyToken = async (googleToken) => {
    const token = googleToken
    return await axios
      .post(`${baseURL}/verify-token/`,
		    { tokenId: token },
	    )
	    .then((res) => {
		    const user_google_info = res.data
		    return user_google_info
	    })
	    .catch((err) => {
		    console.log("Error Verify Token", err)
	    })
  }

  const registerUser = async (user_data) => {
    const username = user_data['name']
    const email = user_data['email']
    const image_url = user_data['picture']
    return await axios
      .post(`${baseURL}/register/`, {
          username: username,
          email: email,
          image_url: image_url
        },
      )
      .then((res) => {
				const { username, email, image_url } = res.data;
				return { username, email, image_url }
      })
      .catch((err) => {
        console.log("Error Regigster User", err)
      })
  }

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

	const handleGoogleLogin = async (googleData) => {

		// ユーザのGoogle:accessTokenをconvertする
		const userAccessToken = googleData.accessToken
		const drfAccessToken = await convertToken(userAccessToken)

		// drfAccessTokenを使ってユーザデータ表示
		const userDetail = await getUserDetail(drfAccessToken)

		// ステート更新
		setUserDetail(userDetail)

		// LocalStorageに保存
		localStorage.setItem('userDetail', JSON.stringify(userDetail))
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
		localStorage.setItem('userDetail', JSON.stringify(userDetail))
	}

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
}

export default App;
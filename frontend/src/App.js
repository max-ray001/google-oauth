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
	const [ userGoogleData , setUserGoogleData ] = useState("");

  const convertToken = async (googleData) => {
		const token = googleData.accessToken
    console.log(token)
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
		    { tokenId: token.tokenId },
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
		const googleToken = response
		const drfAccessToken = await convertToken(googleToken)
		const user_data = await verifyToken(googleToken, drfAccessToken)
		setUserGoogleData(user_data)
	}

	const handleGoogleSignIn = async (googleData) => {
		console.log(googleData)
    const googleToken = googleData
    const user_data = await verifyToken(googleToken)
    const data = await registerUser(user_data)
    console.log(data)
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

export default App;
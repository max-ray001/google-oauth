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

	const verifyToken = async (googleToken, drfToken) => {
		const token = googleToken
		return await axios
      .post(`${baseURL}/verify-token/`,
				{ tokenId: token.tokenId },
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
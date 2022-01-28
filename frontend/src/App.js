import './App.css';

// ライブラリインポート
import GoogleLogin from "react-google-login";
import axios from "axios";

// .env情報取得
const googleClientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
const drfClientId = process.env.REACT_APP_DRF_CLIENT_ID;
const drfClientSecret = process.env.REACT_APP_DRF_CLIENT_RECRET;
const baseURL = "http://localhost:8000";

// 認証成功時の動作
const handleGoogleLogin = (response) => {
    console.log(response)
    axios
        .post(`${baseURL}/auth/convert-token`, {
            token: response.accessToken,
            backend: "google-oauth2",
            grant_type: "convert_token",
            client_id: drfClientId,
            client_secret: drfClientSecret,
        })
        .then((res) => {
            const { access_token, refresh_token } = res.data;
            console.log({ access_token, refresh_token });
            localStorage.setItem("access_token", access_token);
            localStorage.setItem("refresh_token", refresh_token);
        })
        .catch((err) => {
            console.log("Error Google Login", err);
        })
}

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Google OAuth Test</h1>
        <GoogleLogin
            clientId={googleClientId}
            buttonText="Googleアカウントでログイン"
            onSuccess={(response) => handleGoogleLogin(response)}
            onFailure={(err) => console.log("Google Login failed", err)}
        ></GoogleLogin>
      </header>
    </div>
  );
}

export default App;

import { useEffect, useState } from 'react';
import { Button, View } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

const clientId = '974725374753-5df7619sodu6gb4e0tnh23nrcsa0knqi.apps.googleusercontent.com';

export default function GoogleSignIn() {
  const [token, setToken] = useState("");
  const [userInfo, setUserInfo] = useState(null);

  const [request, response, promptAsync] = Google.useAuthRequest({
    expoClientId: clientId,
    iosClientId: clientId,
    scopes: ['openid', 'profile', 'email'],
    usePKCE: true
  });

  useEffect(() => {
    if (response?.type === 'success') {
      setToken(response.authentication.accessToken);
      getUserInfo();
    }
  }, [response]);

  const getUserInfo = async () => {
    try {
      const response = await fetch(
        "https://www.googleapis.com/userinfo/v2/me",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const user = await response.json();
      setUserInfo(user);
      console.log("User info:", user);
    } catch (error) {
      console.log("Error fetching user info: ", error);
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Button
        title="Sign in with Google"
        disabled={!request}
        onPress={() => {
          promptAsync();
        }}
      />
    </View>
  );
}

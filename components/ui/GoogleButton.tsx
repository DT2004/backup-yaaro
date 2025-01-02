import React from 'react'
import { Button } from '@rneui/themed'
import { supabase } from '../../lib/supabase'
import * as WebBrowser from 'expo-web-browser'
import * as Google from 'expo-auth-session/providers/google'
import { AntDesign } from '@expo/vector-icons'
import { StyleSheet } from 'react-native'

WebBrowser.maybeCompleteAuthSession()

export default function GoogleSignInButton() {
  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: '974725374753-5df7619sodu6gb4e0tnh23nrcsa0knqi.apps.googleusercontent.com',
    iosClientId: '974725374753-5df7619sodu6gb4e0tnh23nrcsa0knqi.apps.googleusercontent.com',
    scopes: ['openid', 'profile', 'email'],
    redirectUri: 'com.yaaro.yarro://'
  })

  React.useEffect(() => {
    if (response?.type === 'success') {
      const { access_token } = response.params
      signInWithGoogle(access_token)
    }
  }, [response])

  async function signInWithGoogle(token: string) {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          queryParams: {
            access_token: token,
          },
        },
      })
      if (error) console.error('Sign in error:', error)
      else console.log('Sign in success:', data)
    } catch (error) {
      console.error('Sign in error:', error)
    }
  }

  return (
    <Button
      title="Sign in with Google"
      buttonStyle={styles.buttonGoogle}
      titleStyle={styles.buttonGoogleText}
      containerStyle={styles.buttonGoogleContainer}
      icon={
        <AntDesign
          name="google"
          size={20}
          color="#6b6a6a"
          style={styles.googleIcon}
        />
      }
      onPress={() => promptAsync()}
    />
  )
}

const styles = StyleSheet.create({
  buttonGoogle: {
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    borderRadius: 17,
    padding: 15,
  },
  buttonGoogleText: {
    color: '#6b6a6a',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonGoogleContainer: {
    borderWidth: 1,
    borderColor: '#a742f5',
    borderRadius: 19,
    padding: 1,
  },
  googleIcon: {
    marginRight: 12,
  },
})
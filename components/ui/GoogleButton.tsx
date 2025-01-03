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
    clientId: '1086597401170-99t70np22f8q7dkuq4bj0huqo4h34hjg.apps.googleusercontent.com',
    iosClientId: '1086597401170-99t70np22f8q7dkuq4bj0huqo4h34hjg.apps.googleusercontent.com',
    scopes: ['openid', 'profile', 'email'],
    extraParams: {
      access_type: 'offline',
    },
    redirectUri: 'com.yaaro.yaaro://'
  })

  React.useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params
      signInWithGoogle(id_token)
    }
  }, [response])

  async function signInWithGoogle(idToken: string) {
    try {
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      })
      
      if (error) {
        console.error('Sign in error:', error.message)
        return
      }

      if (data.session) {
        console.log('Successfully signed in:', data.session.user)
      }
    } catch (error) {
      console.error('Sign in error:', error)
    }
  }

  return (
    <Button
      disabled={!request}
      title="Continue with Google"
      buttonStyle={styles.buttonGoogle}
      titleStyle={styles.buttonGoogleText}
      containerStyle={styles.buttonGoogleContainer}
      icon={
        <AntDesign
          name="google"
          size={24}
          color="black"
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
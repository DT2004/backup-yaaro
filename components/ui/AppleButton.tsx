import React from 'react'
import { Button } from '@rneui/themed'
import { supabase } from '../../lib/supabase'
import { Platform, StyleSheet } from 'react-native'
import * as AppleAuthentication from 'expo-apple-authentication'
import { AntDesign } from '@expo/vector-icons'

export default function AppleSignInButton() {
  async function signInWithApple() {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      })

      if (credential.identityToken) {
        const { error, data: { user } } = await supabase.auth.signInWithIdToken({
          provider: 'apple',
          token: credential.identityToken,
        })
        
        if (error) throw error
        console.log('Signed in with Apple:', user)
      } else {
        throw new Error('No identity token received')
      }
    } catch (error: any) {
      if (error.code === 'ERR_REQUEST_CANCELED') {
        console.log('Apple Sign In was canceled')
      } else {
        console.error('Apple Sign In Error:', error)
      }
    }
  }

  if (Platform.OS === 'ios') {
    return (
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
        cornerRadius={13}
        style={styles.appleButton}
        onPress={signInWithApple}
      />
    )
  }

  // Fallback button for non-iOS platforms
  return (
    <Button
      title="Sign in with Apple"
      buttonStyle={styles.buttonApple}
      titleStyle={styles.buttonAppleText}
      containerStyle={styles.buttonAppleContainer}
      icon={
        <AntDesign
          name="apple1"
          size={20}
          color="#FFFFFF"
          style={styles.appleIcon}
        />
      }
      onPress={signInWithApple}
    />
  )
}

const styles = StyleSheet.create({
  appleButton: {
    width: '100%',
    height: 50,
    marginVertical: 8,
  },
  buttonApple: {
    backgroundColor: '#000000',
    borderRadius: 5,
    padding: 12,
  },
  buttonAppleText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  buttonAppleContainer: {
    width: '100%',
    marginVertical: 8,
  },
  appleIcon: {
    marginRight: 8,
  },
})

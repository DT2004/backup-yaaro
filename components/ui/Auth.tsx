import React, { useState, forwardRef } from 'react'
import { Alert, StyleSheet, View, Pressable, Text as RNText } from 'react-native'
import { supabase } from '../../lib/supabase'
import { Button, Input, Text } from '@rneui/themed'
import { Link } from 'expo-router'
import GoogleSignInButton from './GoogleButton'
import AppleSignInButton from './AppleButton'

const StyledText = forwardRef((props: any, ref) => (
  <RNText {...props} ref={ref} />
))

export default function Auth() {
  const [phoneNumber, setPhoneNumber] = useState('')
  const [loading, setLoading] = useState(false)



  async function signInWithPhone() {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({
      phone: phoneNumber,
    })

    if (error) Alert.alert(error.message)
    else Alert.alert('Success', 'Check your phone for the login code!')
    setLoading(false)
  }


  return (
    <View style={styles.container}>
      <View style={[styles.verticallySpaced, styles.pb20]}>
        <GoogleSignInButton />
        <AppleSignInButton />
      </View>
      <View style={styles.verticallySpaced}>
        <Input
          placeholder="Phone number (e.g. +1234567890)"
          onChangeText={(text) => setPhoneNumber(text)}
          value={phoneNumber}
          autoCapitalize={'none'}
          keyboardType="phone-pad"
          inputStyle={styles.input}
          inputContainerStyle={styles.inputContainer}
          containerStyle={styles.fieldContainer}
        />
      </View>
      <View style={[styles.verticallySpaced, styles.mt20]}>
        <Button
          title="Sign in with Phone"
          disabled={loading}
          onPress={() => signInWithPhone()}
          buttonStyle={styles.button}
        />
      </View>
      <View style={styles.footer}>
        <StyledText style={styles.footerText}>Don't have an account? </StyledText>
        <Link href="/(auth)/signup" asChild>
          <StyledText style={styles.link}>Sign up</StyledText>
        </Link>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  verticallySpaced: {
    paddingTop: 4,
    paddingBottom: 4,
    alignSelf: 'stretch',
  },
  mt20: {
    marginTop: 20,
  },
  pb20: {
    paddingBottom: 20,
  },
  fieldContainer: {
    paddingHorizontal: 0,
  },
  inputContainer: {
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 17,
    gap: 23,
    paddingHorizontal: 16,
    paddingVertical: 4,
    height: 56,
  },
  input: {
    color: '#1F2937',
    fontSize: 16,
    height: 48,
  },
  button: {
    backgroundColor: '#a742f5',
    borderRadius: 17,
    padding: 15,
  },
  buttonGoogle: {
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    borderRadius: 17,
    padding: 15,
  },
  buttonGoogleText: {
    color: '#6b6a6a',
    marginLeft: 10,
  },
  buttonGoogleContainer: {
    borderWidth: 1,
    borderColor: '#a742f5',
    borderRadius: 19,
    padding: 1,
  },
  googleIcon: {
    marginRight: 10,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  footerText: {
    color: '#6B7280',
  },
  link: {
    color: '#7C3AED',
    fontWeight: '600',
  },
})
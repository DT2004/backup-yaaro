import React, { useState, forwardRef } from 'react'
import { Alert, StyleSheet, View, Text as RNText } from 'react-native'
import { supabase } from '../../lib/supabase'
import { Button, Input, Text } from '@rneui/themed'
import { Link } from 'expo-router'
import GoogleSignInButton from './GoogleButton'

const StyledText = forwardRef((props: any, ref) => (
  <RNText {...props} ref={ref} />
))

export default function SignUpNative() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function signUpWithEmail() {
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email: email,
      password: password,
    })

    if (error) Alert.alert(error.message)
    else Alert.alert('Success', 'Check your email for the confirmation link!')
    setLoading(false)
  }

  return (
    <View style={styles.container}>
      <View style={[styles.verticallySpaced, styles.pb20]}>
        <GoogleSignInButton />
      </View>
      <View style={styles.verticallySpaced}>
        <Input
          placeholder="Email address"
          onChangeText={(text) => setEmail(text)}
          value={email}
          autoCapitalize={'none'}
          inputStyle={styles.input}
          inputContainerStyle={styles.inputContainer}
          containerStyle={styles.fieldContainer}
        />
      </View>
      <View style={styles.verticallySpaced}>
        <Input
          placeholder="Password"
          onChangeText={(text) => setPassword(text)}
          value={password}
          secureTextEntry={true}
          autoCapitalize={'none'}
          inputStyle={styles.input}
          inputContainerStyle={styles.inputContainer}
          containerStyle={styles.fieldContainer}
        />
      </View>
      <View style={styles.verticallySpaced}>
        <Input
          placeholder="Confirm Password"
          onChangeText={(text) => setConfirmPassword(text)}
          value={confirmPassword}
          secureTextEntry={true}
          autoCapitalize={'none'}
          inputStyle={styles.input}
          inputContainerStyle={styles.inputContainer}
          containerStyle={styles.fieldContainer}
        />
      </View>
      <View style={[styles.verticallySpaced, styles.mt20]}>
        <Button
          title="Sign Up"
          disabled={loading}
          onPress={() => signUpWithEmail()}
          buttonStyle={styles.button}
        />
      </View>
      <View style={styles.linkContainer}>
        <StyledText>Already have an account? </StyledText>
        <Link href="/(auth)/login" asChild>
          <StyledText style={styles.link}>Login</StyledText>
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
  linkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  link: {
    color: '#7C3AED',
    fontWeight: '600',
  },
})
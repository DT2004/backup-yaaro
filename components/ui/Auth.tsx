import React, { useState, forwardRef } from 'react'
import { Alert, StyleSheet, View, Pressable, Text as RNText } from 'react-native'
import { supabase } from '../../lib/supabase'
import { Button, Input, Text } from '@rneui/themed'
import { Link } from 'expo-router'
import GoogleSignInButton from './GoogleButton'

const StyledText = forwardRef((props: any, ref) => (
  <RNText {...props} ref={ref} />
))

export default function Auth() {
  const [phoneNumber, setPhoneNumber] = useState('')
  const [loading, setLoading] = useState(false)

  const formatPhoneNumber = (number: string) => {
    // Remove any non-numeric characters except +
    const cleaned = number.replace(/[^\d+]/g, '')
    // Ensure it starts with +
    return cleaned.startsWith('+') ? cleaned : '+' + cleaned
  }

  async function signInWithPhone() {
    try {
      setLoading(true)
      const formattedPhone = formatPhoneNumber(phoneNumber)
      console.log('Attempting sign in with:', formattedPhone)
      
      const { data, error } = await supabase.auth.signInWithOtp({
        phone: formattedPhone,
      })

      if (error) {
        console.error('OTP Error:', error)
        Alert.alert('Error', error.message)
      } else {
        Alert.alert('Success', 'Check your phone for the login code!')
        console.log('OTP sent successfully:', data)
      }
    } catch (err) {
      console.error('Unexpected error:', err)
      Alert.alert('Error', 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <View style={[styles.verticallySpaced, styles.pb20]}>
        <GoogleSignInButton />
      </View>
      <View style={styles.divider} />
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
      <View style={[styles.verticallySpaced]}>
        <Button
          title={loading ? 'Loading...' : 'Sign in with phone'}
          disabled={loading || !phoneNumber.trim()}
          onPress={signInWithPhone}
          buttonStyle={styles.button}
          titleStyle={styles.buttonText}
          containerStyle={styles.buttonContainer}
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
  pb20: {
    paddingBottom: 20,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 20,
  },
  input: {
    color: '#1F2937',
    fontSize: 16,
  },
  inputContainer: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F9FAFB',
  },
  fieldContainer: {
    paddingHorizontal: 0,
  },
  button: {
    backgroundColor: '#7C3AED',
    borderRadius: 8,
    padding: 12,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  buttonContainer: {
    width: '100%',
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
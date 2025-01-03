import React from 'react';
import { StyleSheet, View, KeyboardAvoidingView, Platform } from 'react-native';
import { Text } from '@rneui/themed';
import AuthNative from '../../components/ui/Auth.native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';

export default function SignupScreen() {
  const router = useRouter();

  // Listen for auth changes
  React.useEffect(() => {
    supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        router.replace('/(tabs)');
      }
    });
  }, [router]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.contentContainer}>
        <View style={styles.innerContainer}>
          <View style={styles.headerContainer}>
            <Text style={styles.title}>Create an Account</Text>
            <Text style={styles.subtitle}>Join Yaaro today</Text>
          </View>
          <View style={styles.authContainer}>
            <AuthNative />
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  contentContainer: {
    flex: 1,
    padding: 20,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    justifyContent: 'center',
  },
  innerContainer: {
    width: '100%',
  },
  headerContainer: {
    marginVertical: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
  },
  authContainer: {
    width: '100%',
  },
});

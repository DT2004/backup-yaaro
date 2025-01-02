import React from 'react';
import { StyleSheet, View, KeyboardAvoidingView, Platform } from 'react-native';
import { Text } from '@rneui/themed';
import Auth from '../../components/ui/Auth';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';

export default function LoginScreen() {
  const router = useRouter();

  // Listen for auth changesss
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
        <View style={styles.headerContainer}>
          <Text style={styles.title}>Welcome to Yarro</Text>
          <Text style={styles.subtitle}>Find your next adventure</Text>
        </View>
        <View style={styles.authContainer}>
          <Auth />
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
    padding: 24,
    justifyContent: 'center',
  },
  headerContainer: {
    marginBottom: 40,
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  subtitle: {
    paddingTop: 8,
    fontSize: 24,
    color: '#a742f5',
  },
  authContainer: {
    width: '100%',
  },
});

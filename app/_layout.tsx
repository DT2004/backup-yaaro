import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Slot, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';
import { useColorScheme } from '@/hooks/useColorScheme';
import { AuthProvider } from '@/contexts/AuthContext';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

function useProtectedRoute(session: Session | null, isReady: boolean) {
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isReady) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      async function fetchUserData() {
        const { data, error } = await supabase.auth.getUser();
        if (error) {
          console.error('Error fetching user data:', error);
          return;
        }
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('quiz_complete')
          .eq('id', data.user.id)
          .single();
        if (profileError) {
          // If no profile exists, redirect to onboarding only if not on specific auth routes
          if (profileError.code === 'PGRST116') {
            const currentRoute = segments.join('/');
            if (!['(auth)/signup', '(auth)/login', '(auth)/onboarding'].includes(currentRoute)) {
              router.replace('/(auth)/onboarding');
            }
            return;
          }
          console.error('Error fetching profile data:', profileError);
          return;
        }
        if (profileData?.quiz_complete) {
          router.replace('/(tabs)');
        } else {
          const currentRoute = segments.join('/');
          if (!['(auth)/signup', '(auth)/login', '(auth)/onboarding'].includes(currentRoute)) {
            router.replace('/(auth)/onboarding');
          }
        }
      }
      fetchUserData();
    }
  }, [session, segments, isReady]);
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const [session, setSession] = useState<Session | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsReady(true);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
  }, []);

  useProtectedRoute(session, isReady);

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded && isReady) {
      SplashScreen.hideAsync();
    }
  }, [loaded, isReady]);

  if (!loaded || !isReady) {
    return null;
  }

  return (
    <AuthProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        <Slot />
      </ThemeProvider>
    </AuthProvider>
  );
}

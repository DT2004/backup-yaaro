import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import { PaperProvider } from 'react-native-paper';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { HeaderBackground } from '@/components/ui/HeaderBackground';
import { HeaderProfile } from '@/components/ui/HeaderProfile';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { ThemedText } from '@/components/ThemedText';
import { ProfileProvider } from '@/contexts/ProfileContext';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <ProfileProvider>
      <PaperProvider>
        <Tabs
          screenOptions={{
            tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
            headerShown: true,
            headerRight: () => <HeaderProfile />,
            tabBarButton: HapticTab,
            tabBarBackground: TabBarBackground,
            headerTransparent: true,
            headerBackground: () => <HeaderBackground />,
            headerStyle: {
              backgroundColor: Platform.select({
                ios: 'rgba(255, 255, 255, 0.85)',
                android: 'rgba(255, 255, 255, 0.95)',
              }),
            },
            tabBarStyle: Platform.select({
              ios: {
                // Use a transparent background on iOS to show the blur effect
                position: 'absolute',
              },
              default: {},
            }),
          }}
        >
          <Tabs.Screen
            name="index"
            options={{
              title: 'Home',
              tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
            }}
          />
          <Tabs.Screen
            name="discover"
            options={{
              title: 'Discover',
              tabBarIcon: ({ color }) => <IconSymbol size={28} name="sparkles" color={color} />,
            }}
          />
          <Tabs.Screen
            name="explore"
            options={{
              title: 'Explore',
              tabBarIcon: ({ color }) => <IconSymbol size={28} name="paperplane.fill" color={color} />,
            }}
          />
          <Tabs.Screen
            name="profile"
            options={{
              title: 'Profile',
              tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.fill" color={color} />,
            }}
          />
        </Tabs>
      </PaperProvider>
    </ProfileProvider>
  );
}

import React, { useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Menu } from 'react-native-paper';
import { Image } from 'expo-image';
import { supabase } from '@/lib/supabase';
import { ThemedText } from '@/components/ThemedText';
import { useProfile } from '@/contexts/ProfileContext';

export function HeaderProfile() {
  const [visible, setVisible] = useState(false);
  const { profile } = useProfile();

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error.message);
    }
    setVisible(false);
  };

  return (
    <Menu
      visible={visible}
      onDismiss={() => setVisible(false)}
      anchor={
        <Pressable 
          onPress={() => setVisible(true)}
          style={({ pressed }) => [
            styles.container,
            { opacity: pressed ? 0.7 : 1 }
          ]}
        >
          <Image
            source={{ uri: profile?.avatar_url }}
            style={styles.avatar}
            contentFit="cover"
          />
        </Pressable>
      }
    >
      <Menu.Item onPress={handleSignOut} title="Sign Out" />
    </Menu>
  );
}

const styles = StyleSheet.create({
  container: {
    marginRight: 15,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#eee',
  },
});

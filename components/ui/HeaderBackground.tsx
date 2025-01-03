import { BlurView } from 'expo-blur';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function HeaderBackground() {
  const insets = useSafeAreaInsets();
  
  return (
    <BlurView 
      intensity={50}
      style={[
        StyleSheet.absoluteFill,
        {
          height: 44 + insets.top,
        }
      ]}
      tint="light"
    />
  );
}

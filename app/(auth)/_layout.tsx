import { Stack } from 'expo-router';
import { View } from 'react-native';

export default function AuthLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Stack 
        screenOptions={{ 
          headerShown: false,
          animation: 'none',
          presentation: 'transparentModal'
        }} 
      />
    </View>
  );
}

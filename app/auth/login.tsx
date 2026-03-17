/**
 * Login Screen
 * TODO: implement full UI using design tokens from src/constants
 * Connects to: useAuthStore.signIn()
 * On success: router.replace('/(app)/home')
 */
import { View, Text } from 'react-native';
import { COLORS } from '@/constants';
export default function LoginScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: COLORS.void, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: COLORS.silver, fontFamily: 'Jost-Light' }}>Login — implement UI here</Text>
    </View>
  );
}

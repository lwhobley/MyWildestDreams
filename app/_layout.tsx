import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="login" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="dream-input" />
          <Stack.Screen name="dream-playback" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="encyclopedia" />
          <Stack.Screen name="symbol-detail" />
          <Stack.Screen name="auth" />
        </Stack>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AlertProvider, AuthProvider } from '@/template';
import { DreamProvider } from '@/contexts/DreamContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function RootLayout() {
  return (
    <ErrorBoundary>
    <AlertProvider>
      <SafeAreaProvider>
        <AuthProvider>
          <DreamProvider>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen name="onboarding" options={{ headerShown: false }} />
              <Stack.Screen name="login" options={{ headerShown: false }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="dream-input" options={{ headerShown: false }} />
              <Stack.Screen
                name="dream-playback"
                options={{ headerShown: false, animation: 'slide_from_bottom' }}
              />
              <Stack.Screen name="encyclopedia" options={{ headerShown: false }} />
              <Stack.Screen name="symbol-detail" options={{ headerShown: false }} />
            </Stack>
          </DreamProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </AlertProvider>
    </ErrorBoundary>
  );
}

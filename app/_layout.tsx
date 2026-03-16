import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AlertProvider, AuthProvider, AuthRouter } from '@/template';
import { DreamProvider } from '@/contexts/DreamContext';
import {
  requestNotificationPermission,
  scheduleAllNotifications,
  registerNotificationTapHandler,
  areNotificationsEnabled,
} from '@/services/notificationService';

export default function RootLayout() {
  const router = useRouter();

  // ── Notification bootstrap ─────────────────────────────────────────────
  useEffect(() => {
    async function setupNotifications() {
      const alreadyEnabled = await areNotificationsEnabled();

      if (alreadyEnabled) {
        // Re-schedule on every launch to keep triggers fresh
        await scheduleAllNotifications();
      } else {
        // First launch — request permission, then schedule if granted
        const granted = await requestNotificationPermission();
        if (granted) await scheduleAllNotifications();
      }
    }

    setupNotifications();

    // Handle notification taps — deep-link into the right screen
    const unsub = registerNotificationTapHandler((data) => {
      if (data.type === 'daily_reminder' || data.type === 'streak_risk') {
        router.push('/dream-input');
      } else if (data.type === 'weekly_insights') {
        router.push('/(tabs)/profile');
      } else if (data.type === 'dream_saved') {
        router.push('/(tabs)/library');
      }
    });

    return unsub;
  }, []);

  return (
    <AlertProvider>
      <SafeAreaProvider>
        <AuthProvider>
          <DreamProvider>
            <AuthRouter
              loginRoute="/login"
              excludeRoutes={['/onboarding']}
            >
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="login" />
                <Stack.Screen name="onboarding" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="dream-input" />
                <Stack.Screen
                  name="dream-playback"
                  options={{ presentation: 'modal', headerShown: false }}
                />
                <Stack.Screen name="encyclopedia" />
                <Stack.Screen
                  name="symbol-detail"
                  options={{ presentation: 'card', headerShown: false }}
                />
              </Stack>
            </AuthRouter>
          </DreamProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </AlertProvider>
  );
}

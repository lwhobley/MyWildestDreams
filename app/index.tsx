import { Redirect } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';

/**
 * Root redirect — determines initial route based on auth + onboarding state.
 */
export default function Index() {
  const { isAuthenticated, isLoading, user } = useAuthStore();

  if (isLoading) return null; // Splash screen handles this

  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;
  if (!user?.onboardingCompleted) return <Redirect href="/(onboarding)/step-1" />;
  return <Redirect href="/(app)/home" />;
}

/**
 * usePushNotifications
 * Manages the full push notification lifecycle:
 * permission state, subscription toggle, and preference sync.
 */
import { useState, useEffect, useCallback } from 'react';
import {
  getPushPermissionState,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  isSubscribedToPush,
  type PushPermissionState,
} from '@/lib/pwa';
import { useAuthStore } from '@/stores/authStore';

interface UsePushNotificationsReturn {
  permissionState: PushPermissionState;
  isSubscribed: boolean;
  isLoading: boolean;
  error: string | null;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
  isSupported: boolean;
}

export function usePushNotifications(): UsePushNotificationsReturn {
  const user = useAuthStore(s => s.user);
  const updatePreferences = useAuthStore(s => s.updatePreferences);

  const [permissionState, setPermissionState] = useState<PushPermissionState>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isSupported = typeof window !== 'undefined'
    && 'serviceWorker' in navigator
    && 'PushManager' in window
    && 'Notification' in window;

  // Initialize state
  useEffect(() => {
    if (!isSupported) { setIsLoading(false); return; }

    const init = async () => {
      setPermissionState(getPushPermissionState());
      setIsSubscribed(await isSubscribedToPush());
      setIsLoading(false);
    };
    init();
  }, [isSupported]);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!user?.id) return false;
    setIsLoading(true);
    setError(null);

    const result = await subscribeToPushNotifications(user.id);

    if (result.success) {
      setIsSubscribed(true);
      setPermissionState('granted');
      // Sync with user preferences
      await updatePreferences({ notificationsEnabled: true });
    } else {
      setError(result.error ?? 'Failed to enable notifications.');
      if (result.error?.includes('denied')) setPermissionState('denied');
    }

    setIsLoading(false);
    return result.success;
  }, [user?.id, updatePreferences]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!user?.id) return false;
    setIsLoading(true);

    const success = await unsubscribeFromPushNotifications(user.id);

    if (success) {
      setIsSubscribed(false);
      await updatePreferences({ notificationsEnabled: false });
    }

    setIsLoading(false);
    return success;
  }, [user?.id, updatePreferences]);

  return { permissionState, isSubscribed, isLoading, error, subscribe, unsubscribe, isSupported };
}

/**
 * PWA utilities — service worker registration, install prompt,
 * push subscriptions, permission state, and VAPID subscription management.
 */
import { supabase } from '@/lib/supabase';

// ─── Service Worker Registration ──────────────────────────────────────────────
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined') return null;
  if (!('serviceWorker' in navigator)) return null;

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });

    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      newWorker?.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          window.dispatchEvent(new CustomEvent('pwa:update-available'));
        }
      });
    });

    return registration;
  } catch (err) {
    console.error('[PWA] SW registration failed:', err);
    return null;
  }
}

// ─── Install Prompt ───────────────────────────────────────────────────────────
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;

export function listenForInstallPrompt(): void {
  if (typeof window === 'undefined') return;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    window.dispatchEvent(new CustomEvent('pwa:install-available'));
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    window.dispatchEvent(new CustomEvent('pwa:installed'));
  });
}

export async function triggerInstallPrompt(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!deferredPrompt) return 'unavailable';
  await deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  deferredPrompt = null;
  return outcome;
}

export function isInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

// ─── Push Permission ──────────────────────────────────────────────────────────
export type PushPermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

export function getPushPermissionState(): PushPermissionState {
  if (typeof window === 'undefined') return 'unsupported';
  if (!('Notification' in window)) return 'unsupported';
  if (!('PushManager' in window)) return 'unsupported';
  return Notification.permission as PushPermissionState;
}

export async function requestPushPermission(): Promise<PushPermissionState> {
  if (getPushPermissionState() === 'unsupported') return 'unsupported';
  const result = await Notification.requestPermission();
  return result as PushPermissionState;
}

// ─── Subscribe to Push ────────────────────────────────────────────────────────
export async function subscribeToPushNotifications(
  userId: string,
): Promise<{ success: boolean; error?: string }> {
  // 1. Check support
  if (!('PushManager' in window)) {
    return { success: false, error: 'Push notifications not supported in this browser.' };
  }

  // 2. Request permission if not already granted
  const permission = await requestPushPermission();
  if (permission !== 'granted') {
    return { success: false, error: 'Notification permission denied.' };
  }

  // 3. Get VAPID public key
  const vapidPublicKey = process.env.EXPO_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidPublicKey) {
    return { success: false, error: 'VAPID key not configured.' };
  }

  try {
    // 4. Get SW registration
    const registration = await navigator.serviceWorker.ready;

    // 5. Check for existing subscription first
    const existingSub = await registration.pushManager.getSubscription();
    if (existingSub) {
      // Already subscribed — just sync with Supabase in case it was lost
      await saveSubscriptionToSupabase(userId, existingSub);
      return { success: true };
    }

    // 6. Subscribe
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });

    // 7. Save to Supabase
    await saveSubscriptionToSupabase(userId, subscription);

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Subscription failed.';
    console.error('[PWA] Push subscribe error:', message);
    return { success: false, error: message };
  }
}

// ─── Unsubscribe ──────────────────────────────────────────────────────────────
export async function unsubscribeFromPushNotifications(
  userId: string,
): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (!subscription) return true;

    // Remove from Supabase
    await supabase
      .from('push_subscriptions')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('endpoint', subscription.endpoint);

    // Unsubscribe from browser
    await subscription.unsubscribe();
    return true;
  } catch (err) {
    console.error('[PWA] Unsubscribe error:', err);
    return false;
  }
}

// ─── Check subscription state ─────────────────────────────────────────────────
export async function isSubscribedToPush(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
  try {
    const registration = await navigator.serviceWorker.ready;
    const sub = await registration.pushManager.getSubscription();
    return !!sub;
  } catch {
    return false;
  }
}

// ─── Save subscription to Supabase ────────────────────────────────────────────
async function saveSubscriptionToSupabase(
  userId: string,
  subscription: PushSubscription,
): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;

  const subJson = subscription.toJSON();

  await supabase.functions.invoke('push-subscribe', {
    body: {
      subscription: {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subJson.keys?.p256dh,
          auth: subJson.keys?.auth,
        },
      },
      platform: 'web',
    },
  });
}

// ─── Send notification (client-side trigger via Edge Function) ────────────────
export async function sendNotification(
  type: 'morning_reminder' | 'render_complete' | 'streak_alert' | 'streak_milestone' | 'weekly_report' | 'custom',
  userId: string,
  data?: Record<string, unknown>,
): Promise<boolean> {
  const { error } = await supabase.functions.invoke('push-send', {
    body: { type, userId, data },
  });
  return !error;
}

// ─── Background Sync ──────────────────────────────────────────────────────────
export async function requestBackgroundSync(tag: string): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  const registration = await navigator.serviceWorker.ready;
  if ('sync' in registration) {
    await (registration as ServiceWorkerRegistration & {
      sync: { register: (tag: string) => Promise<void> };
    }).sync.register(tag);
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

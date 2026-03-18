/**
 * My Wildest Dreams — Push Notification Service
 *
 * Handles 4 notification triggers:
 *   1. Daily morning reminder   — 8:00 AM every day
 *   2. Streak at risk           — 9:00 PM if no dream logged today
 *   3. Weekly insights summary  — Sunday 10:00 AM
 *   4. Post-save affirmation    — fired immediately after a dream is saved
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Dream } from './dreamService';

// ─── Storage keys ─────────────────────────────────────────────────────────
const KEYS = {
  pushToken:    '@mwd_push_token',
  notifEnabled: '@mwd_notifications_enabled',
};

// ─── Notification identifiers (used to cancel/replace) ────────────────────
export const NOTIF_IDS = {
  dailyReminder:   'mwd-daily-reminder',
  streakAtRisk:    'mwd-streak-at-risk',
  weeklyInsights:  'mwd-weekly-insights',
};

// ─── Affirmations pool for post-save nudge ────────────────────────────────
const AFFIRMATIONS = [
  'Your dream has been captured. Let its meaning unfold in the quiet.',
  'Another vision preserved. The subconscious speaks — you are listening.',
  'Dream archived. Every image you save is a letter to your future self.',
  'Recorded. Your inner world is richer than you know.',
  'The dream lives on. Well done for pausing to remember.',
  'Captured. Jung would be proud.',
];

// ─── Configure how notifications appear when the app is foregrounded ──────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

// ─── Permission & token ───────────────────────────────────────────────────

/**
 * Request notification permission and store the Expo push token.
 * Returns true if permission was granted.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!Device.isDevice) {
    console.warn('[Notifications] Push notifications require a physical device.');
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    await AsyncStorage.setItem(KEYS.notifEnabled, 'false');
    return false;
  }

  // Android: create a notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'My Wildest Dreams',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  // Store token locally and sync to Supabase for remote push delivery
  try {
    const tokenData = await Notifications.getExpoPushTokenAsync();
    const token = tokenData.data;
    await AsyncStorage.setItem(KEYS.pushToken, token);

    // Sync to Supabase if user is authenticated
    try {
      const { getSharedSupabaseClient } = await import('@/template');
      const supabase = getSharedSupabaseClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        await supabase.from('user_push_tokens').upsert({
          user_id:  session.user.id,
          token,
          platform: Platform.OS,
        }, { onConflict: 'user_id, token' });
      }
    } catch { /* non-critical — local token still stored */ }
  } catch (err) {
    console.warn('[Notifications] Could not retrieve push token:', err);
  }

  await AsyncStorage.setItem(KEYS.notifEnabled, 'true');
  return true;
}

export async function areNotificationsEnabled(): Promise<boolean> {
  const val = await AsyncStorage.getItem(KEYS.notifEnabled);
  return val === 'true';
}

// ─── Schedule all recurring notifications ────────────────────────────────

/**
 * Cancels all existing scheduled notifications and re-schedules
 * the three recurring triggers. Safe to call on every app launch
 * or when the user toggles notifications on in settings.
 */
export async function scheduleAllNotifications(): Promise<void> {
  // Cancel existing to avoid duplicates on re-schedule
  await Notifications.cancelAllScheduledNotificationsAsync();

  await Promise.all([
    scheduleDailyReminder(),
    scheduleStreakAtRisk(),
    scheduleWeeklyInsights(),
  ]);
}

export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// ─── 1. Daily morning reminder — 8:00 AM ─────────────────────────────────

const MORNING_MESSAGES = [
  { title: '🌙 What did you dream last night?', body: 'Your subconscious spoke. Capture it before it fades.' },
  { title: '✦ Good morning, Dreamer', body: 'The visions of night are waiting to be remembered.' },
  { title: '🌊 Your dreams are still here', body: 'Take a moment to capture what you saw.' },
  { title: '⭐ A new dreamscape awaits', body: 'Record last night\'s dream before the day sweeps it away.' },
  { title: '🌀 The portal is open', body: 'What did your mind create while you slept?' },
];

async function scheduleDailyReminder(): Promise<void> {
  const msg = MORNING_MESSAGES[new Date().getDay() % MORNING_MESSAGES.length];

  await Notifications.scheduleNotificationAsync({
    identifier: NOTIF_IDS.dailyReminder,
    content: {
      title: msg.title,
      body:  msg.body,
      data:  { type: 'daily_reminder' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 8,
      minute: 0,
    },
  });
}

// ─── 2. Streak at risk — 9:00 PM only if no dream logged today ───────────

async function scheduleStreakAtRisk(): Promise<void> {
  const today = new Date().toDateString();
  // Only schedule if user hasn't already logged a dream today
  try {
    const { getSharedSupabaseClient } = await import('@/template');
    const supabase = getSharedSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id) {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const { count } = await supabase
        .from('dreams')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', session.user.id)
        .gte('created_at', startOfDay.toISOString());
      if ((count ?? 0) > 0) return; // Dream already logged today — skip
    }
  } catch {
    // If check fails, schedule anyway as fallback
  }

  await Notifications.scheduleNotificationAsync({
    identifier: NOTIF_IDS.streakAtRisk,
    content: {
      title: '🔥 Your streak is at risk',
      body:  "You haven\'t logged a dream today. Keep the chain alive — even a few words counts.",
      data:  { type: 'streak_risk' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 21,
      minute: 0,
    },
  });
}

// ─── 3. Weekly insights — Sunday 10:00 AM ────────────────────────────────

async function scheduleWeeklyInsights(): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    identifier: NOTIF_IDS.weeklyInsights,
    content: {
      title: '📖 Your weekly dream patterns are ready',
      body:  'Open My Wildest Dreams to explore your symbols, moods, and archetypes from this week.',
      data:  { type: 'weekly_insights' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: 1, // Sunday (expo-notifications: 1 = Sunday)
      hour: 10,
      minute: 0,
    },
  });
}

// ─── 4. Post-save affirmation — immediate, fired after dream saved ────────

/**
 * Call this immediately after addDream() succeeds.
 * Fires an instant local notification with a randomised affirmation.
 */
export async function sendDreamSavedAffirmation(dream: Pick<Dream, 'title'>): Promise<void> {
  const enabled = await areNotificationsEnabled();
  if (!enabled) return;

  const affirmation = AFFIRMATIONS[Math.floor(Math.random() * AFFIRMATIONS.length)];

  await Notifications.scheduleNotificationAsync({
    content: {
      title:  `✦ "${dream.title}" saved`,
      body:   affirmation,
      data:   { type: 'dream_saved' },
    },
    trigger: null, // fires immediately
  });
}

// ─── Notification tap handler ─────────────────────────────────────────────

/**
 * Register a handler for when the user taps a notification.
 * Returns an unsubscribe function — call it in a useEffect cleanup.
 *
 * Usage:
 *   useEffect(() => {
 *     return registerNotificationTapHandler((data) => {
 *       if (data.type === 'daily_reminder') router.push('/dream-input');
 *     });
 *   }, []);
 */
export function registerNotificationTapHandler(
  onTap: (data: Record<string, any>) => void
): () => void {
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data ?? {};
    onTap(data);
  });

  return () => sub.remove();
}

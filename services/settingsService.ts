/**
 * settingsService.ts
 *
 * Syncs user settings to Supabase user_settings table.
 * Falls back to AsyncStorage for guest users.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSharedSupabaseClient } from '@/template';

const LOCAL_KEY = '@mwd_settings';

export interface AppSettings {
  privacyMode:    boolean;
  autoCaption:    boolean;
  ambientSounds:  boolean;
  notifications:  boolean;
}

const DEFAULTS: AppSettings = {
  privacyMode:   true,
  autoCaption:   true,
  ambientSounds: false,
  notifications: false,
};

async function getUserId(): Promise<string | null> {
  try {
    const { data: { session } } = await getSharedSupabaseClient().auth.getSession();
    return session?.user?.id ?? null;
  } catch { return null; }
}

export async function getSettings(): Promise<AppSettings> {
  const userId = await getUserId();

  if (userId) {
    try {
      const { data, error } = await getSharedSupabaseClient()
        .from('user_settings')
        .select('privacy_mode, auto_caption, ambient_sounds, notifications')
        .eq('user_id', userId)
        .single();

      if (!error && data) {
        return {
          privacyMode:   data.privacy_mode,
          autoCaption:   data.auto_caption,
          ambientSounds: data.ambient_sounds,
          notifications: data.notifications,
        };
      }
    } catch { /* fall through */ }
  }

  try {
    const raw = await AsyncStorage.getItem(LOCAL_KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch { /* fall through */ }

  return DEFAULTS;
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const userId = await getUserId();

  if (userId) {
    try {
      await getSharedSupabaseClient()
        .from('user_settings')
        .upsert({
          user_id:        userId,
          privacy_mode:   settings.privacyMode,
          auto_caption:   settings.autoCaption,
          ambient_sounds: settings.ambientSounds,
          notifications:  settings.notifications,
        }, { onConflict: 'user_id' });
    } catch (err) {
      console.warn('[settingsService] Supabase upsert failed:', err);
    }
  }

  await AsyncStorage.setItem(LOCAL_KEY, JSON.stringify(settings));
}

export async function updateSetting<K extends keyof AppSettings>(
  key: K,
  value: AppSettings[K]
): Promise<AppSettings> {
  const current = await getSettings();
  const updated = { ...current, [key]: value };
  await saveSettings(updated);
  return updated;
}

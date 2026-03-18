/**
 * Canonical Supabase client — single instance for the entire app.
 * Import this everywhere: import { supabase } from '@/src/lib/supabase'
 * or via the @/lib/* alias.
 */
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

// ─── Secure Storage Adapter ───────────────────────────────────────────────────
const ExpoSecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    try { return await SecureStore.getItemAsync(key); } catch { return null; }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    await SecureStore.setItemAsync(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    await SecureStore.deleteItemAsync(key);
  },
};

const supabaseUrl     = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('[Supabase] Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage:            ExpoSecureStoreAdapter,
    autoRefreshToken:   true,
    persistSession:     true,
    detectSessionInUrl: false,
  },
});

// ─── Convenience: get current session user ID ─────────────────────────────────
export async function getCurrentUserId(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user?.id ?? null;
  } catch { return null; }
}

// ─── Storage bucket names ─────────────────────────────────────────────────────
export const BUCKETS = {
  audio:      'dream-audio',
  thumbnails: 'dream-thumbnails',
  videos:     'dream-videos',
} as const;

// ─── Upload audio file to storage ─────────────────────────────────────────────
export async function uploadDreamAudio(
  userId: string,
  dreamId: string,
  uri: string,
): Promise<string> {
  const fileName = `${userId}/${dreamId}/recording.m4a`;
  const response = await fetch(uri);
  const blob     = await response.blob();

  const { error } = await supabase.storage
    .from(BUCKETS.audio)
    .upload(fileName, blob, { contentType: 'audio/m4a', upsert: true });

  if (error) throw error;

  const { data } = supabase.storage.from(BUCKETS.audio).getPublicUrl(fileName);
  return data.publicUrl;
}

// ─── Get signed thumbnail URL (private bucket) ───────────────────────────────
export async function getSignedThumbnailUrl(path: string, expiresIn = 3600): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(BUCKETS.thumbnails)
    .createSignedUrl(path, expiresIn);
  if (error) { console.warn('[Supabase Storage]', error.message); return null; }
  return data.signedUrl;
}

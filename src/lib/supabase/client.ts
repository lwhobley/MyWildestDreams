// src/lib/supabase/client.ts
// ─── Supabase Client · Auth + Storage + Realtime ─────────────────────────────

import { createClient } from '@supabase/supabase-js';
import { MMKV } from 'react-native-mmkv';
import * as SecureStore from 'expo-secure-store';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// MMKV for fast local cache (non-sensitive)
export const storage = new MMKV({ id: 'mwd-storage' });

// Secure store adapter for Supabase auth tokens
const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// ─── Storage bucket helpers ───────────────────────────────────────────────────

export const BUCKETS = {
  audio:      'dream-audio',      // raw voice recordings
  video:      'dream-videos',     // rendered dreamscapes
  thumbnails: 'dream-thumbnails', // video preview frames
  audioscapes: 'dream-audioscapes', // soundscape files
} as const;

export async function uploadDreamAudio(
  userId: string,
  dreamId: string,
  uri: string,
): Promise<string> {
  const fileName = `${userId}/${dreamId}/recording.m4a`;
  const response = await fetch(uri);
  const blob = await response.blob();

  const { error } = await supabase.storage
    .from(BUCKETS.audio)
    .upload(fileName, blob, {
      contentType: 'audio/m4a',
      upsert: true,
    });

  if (error) throw error;

  const { data } = supabase.storage.from(BUCKETS.audio).getPublicUrl(fileName);
  return data.publicUrl;
}

export async function getDreamVideoUrl(userId: string, dreamId: string): Promise<string | null> {
  const { data } = supabase.storage
    .from(BUCKETS.video)
    .getPublicUrl(`${userId}/${dreamId}/dreamscape.mp4`);
  return data?.publicUrl ?? null;
}

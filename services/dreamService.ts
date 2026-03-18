/**
 * dreamService.ts
 *
 * Dual-write strategy:
 *   - Authenticated users → Supabase (source of truth)
 *   - Guest / offline     → AsyncStorage (local fallback)
 *
 * Reading always tries Supabase first; falls back to AsyncStorage.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { APP_CONFIG } from '@/constants/config';
import { getSharedSupabaseClient } from '@/template';

export interface Dream {
  id: string;
  title: string;
  description: string;
  styleId: string;
  moodId: string;
  tags: string[];
  thumbnailIndex: number;
  thumbnailUrl?: string;
  interpretation: string;
  createdAt: string;
  isFavorite: boolean;
  duration: string;
  analysis?: Record<string, any>; // full DreamAnalysis blob
  inputMode?: 'voice' | 'text';
}

// ── Supabase row ↔ Dream shape conversion ──────────────────────────────────

function rowToDream(row: any): Dream {
  return {
    id:             row.id,
    title:          row.title,
    description:    row.description,
    styleId:        row.style_id,
    moodId:         row.mood_id,
    tags:           row.tags ?? [],
    thumbnailIndex: row.thumbnail_index ?? 1,
    thumbnailUrl:   row.thumbnail_url ?? undefined,
    interpretation: row.interpretation ?? '',
    isFavorite:     row.is_favorite ?? false,
    duration:       row.duration ?? '0:00',
    createdAt:      row.created_at,
    analysis:       row.analysis ?? undefined,
    inputMode:      row.input_mode ?? 'voice',
  };
}

function dreamToRow(dream: Dream, userId: string) {
  return {
    id:              dream.id,
    user_id:         userId,
    title:           dream.title,
    description:     dream.description,
    style_id:        dream.styleId,
    mood_id:         dream.moodId,
    tags:            dream.tags,
    thumbnail_index: dream.thumbnailIndex,
    thumbnail_url:   dream.thumbnailUrl ?? null,
    interpretation:  dream.interpretation,
    is_favorite:     dream.isFavorite,
    duration:        dream.duration,
    analysis:        dream.analysis ?? null,
    input_mode:      dream.inputMode ?? 'voice',
    created_at:      dream.createdAt,
  };
}

// ── Auth helper ────────────────────────────────────────────────────────────

async function getCurrentUserId(): Promise<string | null> {
  try {
    const supabase = getSharedSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user?.id ?? null;
  } catch {
    return null;
  }
}

// ── Read ───────────────────────────────────────────────────────────────────

export async function getDreams(): Promise<Dream[]> {
  const userId = await getCurrentUserId();

  if (userId) {
    try {
      const supabase = getSharedSupabaseClient();
      const { data, error } = await supabase
        .from('dreams')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!error && data) return data.map(rowToDream);
    } catch (err) {
      console.warn('[dreamService] Supabase getDreams failed, falling back:', err);
    }
  }

  // Local fallback
  const raw = await AsyncStorage.getItem(APP_CONFIG.dreamsStorageKey);
  if (!raw) return getDefaultDreams();
  try {
    return JSON.parse(raw);
  } catch {
    console.warn('[dreamService] Corrupted local dreams data, resetting to defaults');
    return getDefaultDreams();
  }
}

// ── Write ──────────────────────────────────────────────────────────────────

export async function saveDream(dream: Dream): Promise<void> {
  const userId = await getCurrentUserId();

  if (userId) {
    try {
      const supabase = getSharedSupabaseClient();
      const { error } = await supabase
        .from('dreams')
        .upsert(dreamToRow(dream, userId), { onConflict: 'id' });

      if (!error) return;
      console.warn('[dreamService] Supabase saveDream failed, writing local:', error.message);
    } catch (err) {
      console.warn('[dreamService] Supabase saveDream exception:', err);
    }
  }

  // Local fallback
  const existing = await getDreams();
  const updated = [dream, ...existing.filter((d) => d.id !== dream.id)];
  await AsyncStorage.setItem(APP_CONFIG.dreamsStorageKey, JSON.stringify(updated));
}

// ── Toggle favourite ───────────────────────────────────────────────────────

export async function toggleFavorite(dreamId: string): Promise<Dream[]> {
  const userId = await getCurrentUserId();
  const dreams = await getDreams();
  const dream = dreams.find((d) => d.id === dreamId);
  if (!dream) return dreams;

  const newValue = !dream.isFavorite;

  if (userId) {
    try {
      const supabase = getSharedSupabaseClient();
      await supabase
        .from('dreams')
        .update({ is_favorite: newValue })
        .eq('id', dreamId)
        .eq('user_id', userId);
    } catch (err) {
      console.warn('[dreamService] toggleFavorite Supabase error:', err);
    }
  }

  const updated = dreams.map((d) =>
    d.id === dreamId ? { ...d, isFavorite: newValue } : d
  );
  // Only persist locally for guest users; authenticated users rely on Supabase
  if (!userId) {
    await AsyncStorage.setItem(APP_CONFIG.dreamsStorageKey, JSON.stringify(updated));
  }
  return updated;
}

// ── Delete ─────────────────────────────────────────────────────────────────

export async function deleteDream(dreamId: string): Promise<Dream[]> {
  const userId = await getCurrentUserId();

  if (userId) {
    try {
      const supabase = getSharedSupabaseClient();
      await supabase
        .from('dreams')
        .delete()
        .eq('id', dreamId)
        .eq('user_id', userId);
    } catch (err) {
      console.warn('[dreamService] deleteDream Supabase error:', err);
    }
  }

  const dreams = await getDreams();
  const updated = dreams.filter((d) => d.id !== dreamId);
  // Only persist locally for guest users; authenticated users rely on Supabase
  if (!userId) {
    await AsyncStorage.setItem(APP_CONFIG.dreamsStorageKey, JSON.stringify(updated));
  }
  return updated;
}

// ── Onboarding ─────────────────────────────────────────────────────────────

export async function isOnboardingComplete(): Promise<boolean> {
  const userId = await getCurrentUserId();

  if (userId) {
    try {
      const supabase = getSharedSupabaseClient();
      const { data } = await supabase
        .from('user_profiles')
        .select('onboarding_done')
        .eq('id', userId)
        .single();
      if (data) return data.onboarding_done;
    } catch { /* fall through */ }
  }

  const val = await AsyncStorage.getItem(APP_CONFIG.onboardingKey);
  return val === 'true';
}

export async function setOnboardingComplete(): Promise<void> {
  const userId = await getCurrentUserId();

  if (userId) {
    try {
      const supabase = getSharedSupabaseClient();
      await supabase
        .from('user_profiles')
        .update({ onboarding_done: true })
        .eq('id', userId);
    } catch { /* fall through */ }
  }

  await AsyncStorage.setItem(APP_CONFIG.onboardingKey, 'true');
}

// ── Helpers ────────────────────────────────────────────────────────────────

export function generateDreamId(): string {
  // Use crypto.randomUUID for unpredictable IDs
  const uuid = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 11)}`;
  return `dream_${uuid}`;
}

export function calculateStreak(dreams: Dream[]): number {
  if (dreams.length === 0) return 0;

  // Normalise each dream to local midnight, deduplicate days, sort descending
  const toLocalMidnight = (iso: string): number => {
    const d = new Date(iso);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  };

  const uniqueDays = [...new Set(dreams.map((d) => toLocalMidnight(d.createdAt)))]
    .sort((a, b) => b - a); // newest first

  const todayMidnight = toLocalMidnight(new Date().toISOString());
  const oneDayMs      = 86_400_000;

  // Streak must start today or yesterday (allow up to 1 day gap to start)
  if (uniqueDays[0] < todayMidnight - oneDayMs) return 0;

  let streak = 1;
  for (let i = 1; i < uniqueDays.length; i++) {
    // Each consecutive day in the sorted list must be exactly 1 day earlier
    if (uniqueDays[i - 1] - uniqueDays[i] === oneDayMs) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

export function getRandomThumbnailIndex(): number {
  return Math.floor(Math.random() * 4) + 1;
}

function getDefaultDreams(): Dream[] {
  return [
    {
      id: 'default_1',
      title: 'The Purple Forest',
      description: 'I wandered through a forest where every tree glowed violet, and strange orbs of light floated between the branches, humming a melody I almost recognized.',
      styleId: 'surreal', moodId: 'mysterious',
      tags: ['forest', 'light', 'music', 'wandering'],
      thumbnailIndex: 1, thumbnailUrl: undefined,
      interpretation: 'The glowing forest represents a journey inward — each tree a memory, each orb a question your subconscious is trying to answer.',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      isFavorite: true, duration: '2:34',
    },
    {
      id: 'default_2',
      title: 'Neon Rain',
      description: 'Rain fell upward in a chrome city at night. Each droplet was a different color of neon.',
      styleId: 'cyberpunk', moodId: 'euphoric',
      tags: ['city', 'rain', 'neon', 'sky'],
      thumbnailIndex: 2,
      interpretation: 'Inverted rain signals a reversal of expectations. You are seeing the world from a new vantage point.',
      createdAt: new Date(Date.now() - 172800000).toISOString(),
      isFavorite: false, duration: '1:58',
    },
    {
      id: 'default_3',
      title: 'Ink & Water',
      description: 'Everything dissolved like watercolor in rain. The mountains became brushstrokes.',
      styleId: 'watercolor', moodId: 'peaceful',
      tags: ['art', 'mountains', 'dissolution', 'creation'],
      thumbnailIndex: 3,
      interpretation: 'Being the painter and the painting reflects a deep sense of creative identity.',
      createdAt: new Date(Date.now() - 259200000).toISOString(),
      isFavorite: false, duration: '3:12',
    },
    {
      id: 'default_4',
      title: 'Cathedral at Midnight',
      description: 'An ancient cathedral rose from fog. Ravens circled its spires.',
      styleId: 'gothic', moodId: 'melancholic',
      tags: ['cathedral', 'mirrors', 'past', 'ravens'],
      thumbnailIndex: 4,
      interpretation: 'The cathedral is your inner world — vast, ancient, full of echoes.',
      createdAt: new Date(Date.now() - 345600000).toISOString(),
      isFavorite: true, duration: '2:47',
    },
  ];
}

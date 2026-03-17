/**
 * Dream CRUD Service — Priority 3: Library + Search
 * All DB operations go through Supabase with Row-Level Security.
 * Users can only read/write their own dreams — enforced at DB level.
 */
import { supabase } from '@/lib/supabase';
import type { Dream, DreamStyle, DreamTag, DreamEmotion } from '@/types';
import type { TranscriptionResult } from './voiceService';
import type { ParsedDream } from './dreamParser';

// ─── Create ───────────────────────────────────────────────────────────────────
export async function createDream(
  userId: string,
  transcriptionResult: TranscriptionResult,
  parsedDream: ParsedDream,
  selectedStyle: DreamStyle,
  styleOverride: boolean,
): Promise<Dream> {
  const dreamId = crypto.randomUUID();

  const { data, error } = await supabase
    .from('dreams')
    .insert({
      id: dreamId,
      user_id: userId,
      title: parsedDream.title,
      raw_transcription: transcriptionResult.text,
      edited_transcription: transcriptionResult.text,
      style: selectedStyle,
      style_override: styleOverride,
      emotions: parsedDream.emotions,
      tags: parsedDream.tags,
      symbols: parsedDream.symbols,
      narrative_arcs: parsedDream.narrativeArcs,
      audio_url: transcriptionResult.audioPath,
      video_url: null,
      thumbnail_url: null,
      duration_seconds: 0,
      render_status: 'pending',
      is_private: true,
      is_favorited: false,
      is_shared: false,
      share_id: null,
      metadata: {
        wordCount: transcriptionResult.wordCount,
        recordingDurationSeconds: transcriptionResult.durationSeconds,
        symbolCount: parsedDream.symbols.length,
        emotionIntensity: parsedDream.emotionIntensity,
        aiStyleSuggestion: parsedDream.recommendedStyle,
        aiConfidence: parsedDream.styleConfidence,
        renderTimeSeconds: 0,
        modelVersions: { parser: 'gpt-4o', renderer: 'runway-gen3', audio: 'elevenlabs-v3' },
      },
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as unknown as Dream;
}

// ─── Read ─────────────────────────────────────────────────────────────────────
export async function getDream(dreamId: string): Promise<Dream | null> {
  const { data, error } = await supabase
    .from('dreams')
    .select('*')
    .eq('id', dreamId)
    .single();
  if (error) return null;
  return data as unknown as Dream;
}

export interface ListDreamsOptions {
  userId: string;
  limit?: number;
  offset?: number;
  tags?: DreamTag[];
  emotions?: DreamEmotion[];
  style?: DreamStyle;
  favoritedOnly?: boolean;
  searchQuery?: string;
  dateFrom?: string;
  dateTo?: string;
}

export async function listDreams(opts: ListDreamsOptions): Promise<Dream[]> {
  let query = supabase
    .from('dreams')
    .select('*')
    .eq('user_id', opts.userId)
    .eq('render_status', 'complete')
    .order('created_at', { ascending: false })
    .limit(opts.limit ?? 20)
    .range(opts.offset ?? 0, (opts.offset ?? 0) + (opts.limit ?? 20) - 1);

  if (opts.favoritedOnly) query = query.eq('is_favorited', true);
  if (opts.tags?.length) query = query.contains('tags', opts.tags);
  if (opts.emotions?.length) query = query.contains('emotions', opts.emotions);
  if (opts.style) query = query.eq('style', opts.style);
  if (opts.dateFrom) query = query.gte('created_at', opts.dateFrom);
  if (opts.dateTo) query = query.lte('created_at', opts.dateTo);
  if (opts.searchQuery) {
    // Full-text search on title + transcription (Supabase pg_trgm index)
    query = query.textSearch('search_vector', opts.searchQuery, { type: 'websearch' });
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as Dream[];
}

// ─── Update ───────────────────────────────────────────────────────────────────
export async function toggleFavorite(dreamId: string, isFavorited: boolean): Promise<void> {
  const { error } = await supabase
    .from('dreams')
    .update({ is_favorited: isFavorited })
    .eq('id', dreamId);
  if (error) throw new Error(error.message);
}

export async function updateDreamStyle(dreamId: string, style: DreamStyle): Promise<void> {
  const { error } = await supabase
    .from('dreams')
    .update({ style, style_override: true })
    .eq('id', dreamId);
  if (error) throw new Error(error.message);
}

export async function updateRenderStatus(
  dreamId: string,
  status: Dream['renderStatus'],
  videoUrl?: string,
  thumbnailUrl?: string,
  durationSeconds?: number,
): Promise<void> {
  const { error } = await supabase
    .from('dreams')
    .update({
      render_status: status,
      ...(videoUrl && { video_url: videoUrl }),
      ...(thumbnailUrl && { thumbnail_url: thumbnailUrl }),
      ...(durationSeconds && { duration_seconds: durationSeconds }),
    })
    .eq('id', dreamId);
  if (error) throw new Error(error.message);
}

// ─── Delete ───────────────────────────────────────────────────────────────────
export async function deleteDream(dreamId: string): Promise<void> {
  const { error } = await supabase
    .from('dreams')
    .delete()
    .eq('id', dreamId);
  if (error) throw new Error(error.message);
}

// ─── Sharing ──────────────────────────────────────────────────────────────────
export async function shareDreamToCommunity(dreamId: string): Promise<string> {
  const shareId = crypto.randomUUID().slice(0, 8);
  const { error } = await supabase
    .from('dreams')
    .update({ is_shared: true, share_id: shareId })
    .eq('id', dreamId);
  if (error) throw new Error(error.message);
  return shareId;
}

// ─── Stats ────────────────────────────────────────────────────────────────────
export async function getUserDreamStats(userId: string): Promise<{
  totalDreams: number;
  streakCount: number;
  lastDreamDate: string | null;
  thisMonthCount: number;
}> {
  const { data, error } = await supabase
    .rpc('get_user_dream_stats', { p_user_id: userId });
  if (error) throw new Error(error.message);
  return data;
}

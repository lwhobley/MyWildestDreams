/**
 * Dream Parser Service
 * Calls Supabase Edge Function which runs GPT-4 server-side.
 * Extracts: entities, symbols, narrative arcs, AI-recommended style, title.
 * Never calls OpenAI directly from client — API key stays server-side only.
 */
import { supabase } from '@/lib/supabase';
import type { Dream, DreamSymbol, DreamStyle, DreamEmotion } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface ParsedDream {
  title: string;
  symbols: DreamSymbol[];
  narrativeArcs: string[];
  emotions: DreamEmotion[];
  recommendedStyle: DreamStyle;
  styleConfidence: number;    // 0-1
  emotionIntensity: number;   // 0-1
  tags: Dream['tags'];
  symbolismSummary: string;   // Overall interpretation paragraph
}

export interface ParseDreamInput {
  transcription: string;
  userId: string;
  dreamId: string;
  clientEmotions: DreamEmotion[]; // from client-side detection, used as hint
}

// ─── Main Parser ──────────────────────────────────────────────────────────────
export async function parseDream(input: ParseDreamInput): Promise<ParsedDream> {
  const { data, error } = await supabase.functions.invoke<ParsedDream>('parse-dream', {
    body: input,
  });

  if (error || !data) {
    throw new Error(error?.message ?? 'Dream parser unavailable. Please try again.');
  }

  return data;
}

// ─── Symbolism Interpreter (for existing dreams) ──────────────────────────────
export async function interpretSymbols(
  dreamId: string,
  symbols: DreamSymbol[],
  userId: string,
): Promise<{ summary: string; symbols: DreamSymbol[] }> {
  // Check if user has symbolism access (handled server-side via RLS + tier check)
  const { data, error } = await supabase.functions.invoke('interpret-symbols', {
    body: { dreamId, symbols, userId },
  });

  if (error) throw new Error(error.message);
  return data;
}

// ─── Pattern Analysis (Oracle tier only) ──────────────────────────────────────
export async function analyzeDreamPatterns(userId: string): Promise<{
  recurringSymbols: Array<{ symbol: string; count: number; meaning: string }>;
  emotionalArcs: string[];
  monthlyInsight: string;
  recommendedFocusAreas: string[];
}> {
  const { data, error } = await supabase.functions.invoke('analyze-patterns', {
    body: { userId },
  });

  if (error) throw new Error(error.message);
  return data;
}

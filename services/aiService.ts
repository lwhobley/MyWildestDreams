// AI Dream Processing Service
// Real analysis via OnSpace AI Edge Function; rendering is simulated

import { getSupabaseClient } from '@/template';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { DREAM_STYLES } from '@/constants/config';
import type { DreamAnalysis } from '@/components/ui/DreamAnalysisCard';

export type { DreamAnalysis };

// ─── Real AI Dream Analysis ────────────────────────────────────────────────

export async function analyzeDream(
  description: string,
  styleId: string
): Promise<DreamAnalysis> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.functions.invoke('analyze-dream', {
    body: { description, styleId },
  });

  if (error) {
    let errorMessage = error.message;
    if (error instanceof FunctionsHttpError) {
      try {
        const statusCode = error.context?.status ?? 500;
        const textContent = await error.context?.text();
        errorMessage = `[Code: ${statusCode}] ${textContent || error.message || 'Unknown error'}`;
      } catch {
        errorMessage = error.message || 'Failed to read response';
      }
    }
    console.error('analyzeDream error:', errorMessage);
    // Fall back to mock on error
    return mockAnalysis(description, styleId);
  }

  if (!data?.analysis) {
    console.warn('No analysis in response, using mock');
    return mockAnalysis(description, styleId);
  }

  return data.analysis as DreamAnalysis;
}

// ─── Mock Fallback ─────────────────────────────────────────────────────────

function mockAnalysis(description: string, styleId: string): DreamAnalysis {
  const allTags = [
    ['flying', 'ascension', 'freedom', 'height'],
    ['threshold', 'passage', 'unknown', 'searching'],
    ['nature', 'memory', 'growth', 'ancient'],
    ['writing', 'communication', 'moonlight', 'loss'],
    ['bridge', 'nostalgia', 'home', 'crossing'],
    ['water', 'reflection', 'depth', 'self'],
  ];
  const tags = allTags[Math.floor(Math.random() * allTags.length)];
  const moods = ['peaceful', 'mysterious', 'anxious', 'euphoric', 'melancholic', 'surreal', 'joyful'];

  return {
    title: generatePoetictitle(description),
    emotionalTone: {
      primary: 'Longing',
      secondary: 'Wonder',
      intensity: 'High',
    },
    keySymbols: [
      { symbol: 'Threshold', meaning: 'A boundary between the known and unknown self' },
      { symbol: 'Light', meaning: 'Consciousness breaking through the unconscious' },
      { symbol: 'Water', meaning: 'The flow of emotions and the collective unconscious' },
    ],
    narrativeArc: {
      stage: 'Liminal',
      summary: 'The dreamer hovers between two states of being, neither here nor there.',
    },
    jungianArchetypes: [
      { archetype: 'The Self', manifestation: 'Appears as a guiding presence or inner compass' },
      { archetype: 'Anima/Animus', manifestation: 'Emerges through emotional resonance with dream figures' },
    ],
    shadowElements: 'Unresolved tension between the desire for freedom and the comfort of the familiar.',
    interpretation: 'This dream draws you toward a liminal space where transformation waits. The symbols speak of thresholds not yet crossed — an invitation from the deeper self to release old patterns and step into the unfamiliar.',
    tags,
    moodId: moods[Math.floor(Math.random() * moods.length)],
  };
}

// ─── AI Dream Image Generation ───────────────────────────────────────────────

export async function generateDreamImage(
  description: string,
  styleId: string,
  title: string
): Promise<string | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.functions.invoke('generate-dream-image', {
    body: { description, styleId, title },
  });

  if (error) {
    let errorMessage = error.message;
    if (error instanceof FunctionsHttpError) {
      try {
        const statusCode = error.context?.status ?? 500;
        const textContent = await error.context?.text();
        errorMessage = `[Code: ${statusCode}] ${textContent || error.message || 'Unknown error'}`;
      } catch {
        errorMessage = error.message || 'Failed to read response';
      }
    }
    console.error('generateDreamImage error:', errorMessage);
    return null;  // Fallback to static thumbnail
  }

  return data?.thumbnailUrl ?? null;
}

// ─── Dreamscape Rendering (Simulated) ─────────────────────────────────────

export async function renderDreamscape(
  description: string,
  styleId: string,
  onProgress: (p: number) => void
): Promise<{ thumbnailIndex: number; duration: string }> {
  const steps = [0.1, 0.25, 0.4, 0.55, 0.7, 0.82, 0.91, 0.97, 1.0];
  for (const step of steps) {
    await delay(280 + Math.random() * 150);
    onProgress(step);
  }
  const mins = Math.floor(Math.random() * 3) + 1;
  const secs = Math.floor(Math.random() * 59).toString().padStart(2, '0');
  return {
    thumbnailIndex: Math.floor(Math.random() * 4) + 1,
    duration: `${mins}:${secs}`,
  };
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function generatePoetictitle(description: string): string {
  const prefixes = ['The', 'A', 'When', 'Beyond', 'Within', 'Through', 'Where'];
  const words = description.split(' ').filter((w) => w.length > 4);
  const keyWord = words[Math.floor(Math.random() * Math.min(words.length, 5))] || 'Dream';
  const clean = keyWord.charAt(0).toUpperCase() + keyWord.slice(1).replace(/[^a-zA-Z]/g, '');
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffixes = ['of Light', 'at Midnight', 'Unfolding', 'Unseen', 'Within', 'Beyond'];
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
  return `${prefix} ${clean} ${suffix}`;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

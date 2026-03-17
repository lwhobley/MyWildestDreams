// src/lib/video/renderPipeline.ts
// ─── Dream Render Pipeline · Runway ML + Supabase ──────────────────────────────
//
// Orchestrates the full dream → video pipeline:
//   parseDream → buildPrompt → Runway Gen-3 → poll status → store → update DB

import { supabase, BUCKETS } from '@/lib/supabase/client';
import { parseDream, buildVideoPrompt } from '@/lib/ai/dreamParser';
import type { Dream, DreamRenderStatus, ParsedDream } from '@/types';
import type { VisualStyleId } from '@/theme/tokens';

const RUNWAY_API = 'https://api.runwayml.com/v1';
const RUNWAY_KEY = process.env.RUNWAY_API_KEY;

// Progress stage weights (sum to 100)
const STAGE_WEIGHTS: Record<DreamRenderStatus, number> = {
  idle:             0,
  transcribing:     10,
  parsing:          25,
  mapping_symbols:  40,
  applying_style:   55,
  rendering_video:  85,
  generating_audio: 95,
  complete:         100,
  error:            0,
};

type ProgressCallback = (status: DreamRenderStatus, progress: number) => void;

// ─── Main Orchestrator ────────────────────────────────────────────────────────

export async function runDreamPipeline(
  dreamId: string,
  userId: string,
  transcription: string,
  style: VisualStyleId,
  onProgress: ProgressCallback,
): Promise<void> {

  const update = async (status: DreamRenderStatus) => {
    const progress = STAGE_WEIGHTS[status];
    onProgress(status, progress);
    await supabase
      .from('dreams')
      .update({ render_status: status, render_progress: progress })
      .eq('id', dreamId);
  };

  try {
    // ── Stage 1: Parse dream with GPT-4o
    await update('parsing');
    const parsed = await parseDream(transcription);

    await supabase
      .from('dreams')
      .update({ parsed_dream: parsed })
      .eq('id', dreamId);

    // ── Stage 2: Map symbols (stored in parsed_dream, update progress)
    await update('mapping_symbols');
    await new Promise(r => setTimeout(r, 800)); // brief UX pause

    // ── Stage 3: Build video prompt
    await update('applying_style');
    const videoPrompt = buildVideoPrompt(parsed, style);

    // ── Stage 4: Submit to Runway Gen-3
    await update('rendering_video');
    const runwayJobId = await submitToRunway(videoPrompt, style);

    // ── Stage 5: Poll Runway for completion
    const videoUrl = await pollRunwayJob(runwayJobId, dreamId, userId, onProgress);

    // ── Stage 6: Generate soundscape (Play.ht)
    await update('generating_audio');
    const audioscapeUrl = await generateAudioscape(parsed, dreamId, userId);

    // ── Stage 7: Generate thumbnail
    const thumbnailUrl = await generateThumbnail(videoUrl, dreamId, userId);

    // ── Complete
    await supabase
      .from('dreams')
      .update({
        render_status: 'complete',
        render_progress: 100,
        video_url: videoUrl,
        audioscape_url: audioscapeUrl,
        thumbnail_url: thumbnailUrl,
      })
      .eq('id', dreamId);

    onProgress('complete', 100);

    // Update streak
    await supabase
      .from('dream_dates')
      .upsert({ user_id: userId, dream_date: new Date().toISOString().split('T')[0] });

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Render pipeline failed.';
    console.error('[renderPipeline] error:', message);

    await supabase
      .from('dreams')
      .update({ render_status: 'error', render_progress: 0 })
      .eq('id', dreamId);

    onProgress('error', 0);
    throw err;
  }
}

// ─── Runway ML Integration ────────────────────────────────────────────────────

async function submitToRunway(prompt: string, style: VisualStyleId): Promise<string> {
  // Runway Gen-3 Alpha Turbo — text-to-video
  const response = await fetch(`${RUNWAY_API}/text_to_video`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${RUNWAY_KEY}`,
      'X-Runway-Version': '2024-11-06',
    },
    body: JSON.stringify({
      promptText: prompt,
      model: 'gen3a_turbo',
      duration: 10,          // seconds
      ratio: '768:1280',     // 9:16 portrait
      seed: Math.floor(Math.random() * 999999),
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Runway submission failed: ${err?.error ?? response.status}`);
  }

  const data = await response.json();
  return data.id as string;
}

async function pollRunwayJob(
  jobId: string,
  dreamId: string,
  userId: string,
  onProgress: ProgressCallback,
): Promise<string> {
  const MAX_POLLS = 60;
  const POLL_INTERVAL_MS = 5000;

  for (let i = 0; i < MAX_POLLS; i++) {
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));

    const response = await fetch(`${RUNWAY_API}/tasks/${jobId}`, {
      headers: {
        Authorization: `Bearer ${RUNWAY_KEY}`,
        'X-Runway-Version': '2024-11-06',
      },
    });

    const data = await response.json();

    if (data.status === 'SUCCEEDED') {
      const videoUrl = data.output?.[0] as string;
      if (!videoUrl) throw new Error('No video URL in Runway response.');
      return videoUrl;
    }

    if (data.status === 'FAILED') {
      throw new Error(`Runway render failed: ${data.failure ?? 'Unknown error'}`);
    }

    // Update progress within rendering_video stage (55–85)
    const progress = 55 + Math.min(28, Math.floor((i / MAX_POLLS) * 28));
    onProgress('rendering_video', progress);
    await supabase
      .from('dreams')
      .update({ render_progress: progress })
      .eq('id', dreamId);
  }

  throw new Error('Runway render timed out after 5 minutes.');
}

// ─── Soundscape Generation (Play.ht) ─────────────────────────────────────────

async function generateAudioscape(
  parsed: ParsedDream,
  dreamId: string,
  userId: string,
): Promise<string | undefined> {
  try {
    // Play.ht text-to-audio for ambient soundscape narration
    // For MVP: use ambient description prompt → TTS → store
    const narratorText = `${parsed.title}. ${parsed.summary}`;

    const response = await fetch('https://api.play.ht/api/v2/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.PLAYHT_API_KEY}`,
        'X-User-Id': process.env.PLAYHT_USER_ID ?? '',
      },
      body: JSON.stringify({
        text: narratorText,
        voice: 'en-US-Neural2-F',  // Calm feminine voice
        output_format: 'mp3',
        sample_rate: 44100,
        speed: 0.85,               // Slower, dreamlike
      }),
    });

    if (!response.ok) return undefined;

    const audioBuffer = await response.arrayBuffer();

    const { error } = await supabase.storage
      .from(BUCKETS.audioscapes)
      .upload(`${userId}/${dreamId}/soundscape.mp3`, audioBuffer, {
        contentType: 'audio/mp3',
        upsert: true,
      });

    if (error) return undefined;

    const { data } = supabase.storage
      .from(BUCKETS.audioscapes)
      .getPublicUrl(`${userId}/${dreamId}/soundscape.mp3`);

    return data.publicUrl;
  } catch {
    // Non-fatal: soundscape is optional
    return undefined;
  }
}

// ─── Thumbnail Extraction ─────────────────────────────────────────────────────

async function generateThumbnail(
  videoUrl: string,
  dreamId: string,
  userId: string,
): Promise<string | undefined> {
  // For MVP: use Supabase Edge Function to extract first frame
  // POST /functions/v1/extract-thumbnail { videoUrl, dreamId, userId }
  try {
    const { data, error } = await supabase.functions.invoke('extract-thumbnail', {
      body: { videoUrl, dreamId, userId },
    });

    if (error) return undefined;
    return data?.thumbnailUrl as string | undefined;
  } catch {
    return undefined;
  }
}

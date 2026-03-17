/**
 * Dream Rendering Pipeline Service — Priority 2
 * Orchestrates: Parse → Style → Runway ML → ElevenLabs audio → encode → store
 * All heavy compute happens in Supabase Edge Functions / background workers.
 * Client polls for status via Supabase Realtime.
 */
import { supabase } from '@/lib/supabase';
import { RENDER_POLL_INTERVAL_MS, BUCKETS } from '@/constants';
import type { Dream, DreamStyle, RenderJob, RenderStatus } from '@/types';
import type { ParsedDream } from './dreamParser';

// ─── Start Render ─────────────────────────────────────────────────────────────
export interface StartRenderInput {
  dreamId: string;
  userId: string;
  transcription: string;
  parsedDream: ParsedDream;
  selectedStyle: DreamStyle;
  styleOverride: boolean;
}

export async function startRenderJob(input: StartRenderInput): Promise<RenderJob> {
  const { data, error } = await supabase.functions.invoke<RenderJob>('start-render', {
    body: input,
  });

  if (error || !data) {
    throw new Error(error?.message ?? 'Render service unavailable.');
  }

  // Persist job ref in DB for recovery if app backgrounds
  await supabase.from('render_jobs').upsert({
    id: data.jobId,
    dream_id: input.dreamId,
    user_id: input.userId,
    status: 'pending',
    progress: 0,
    started_at: new Date().toISOString(),
  });

  return data;
}

// ─── Poll Job Status (callback pattern) ───────────────────────────────────────
export function subscribeToRenderJob(
  jobId: string,
  onUpdate: (job: RenderJob) => void,
  onComplete: (dreamId: string, videoUrl: string) => void,
  onError: (error: string) => void,
): () => void {
  // Use Supabase Realtime for push updates instead of polling
  const channel = supabase
    .channel(`render-job-${jobId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'render_jobs',
        filter: `id=eq.${jobId}`,
      },
      (payload) => {
        const row = payload.new as Record<string, unknown>;
        const job: RenderJob = {
          jobId: row.id as string,
          dreamId: row.dream_id as string,
          status: row.status as RenderStatus,
          progress: row.progress as number,
          currentStep: row.current_step as RenderJob['currentStep'],
          estimatedSecondsRemaining: row.estimated_seconds as number,
          error: row.error as string | null,
          startedAt: row.started_at as string,
          completedAt: row.completed_at as string | null,
        };

        onUpdate(job);

        if (job.status === 'complete' && row.video_url) {
          onComplete(job.dreamId, row.video_url as string);
        } else if (job.status === 'failed') {
          onError(job.error ?? 'Render failed unexpectedly.');
        }
      },
    )
    .subscribe();

  // Fallback: also poll every 3s in case realtime is blocked
  const pollInterval = setInterval(async () => {
    const { data } = await supabase
      .from('render_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (data) {
      onUpdate(data as unknown as RenderJob);
      if (data.status === 'complete') {
        clearInterval(pollInterval);
        onComplete(data.dream_id, data.video_url);
      } else if (data.status === 'failed') {
        clearInterval(pollInterval);
        onError(data.error ?? 'Render failed.');
      }
    }
  }, RENDER_POLL_INTERVAL_MS);

  // Return unsubscribe function
  return () => {
    clearInterval(pollInterval);
    supabase.removeChannel(channel);
  };
}

// ─── Re-render (new style on existing dream) ──────────────────────────────────
export async function reRenderDream(
  dreamId: string,
  userId: string,
  newStyle: DreamStyle,
): Promise<RenderJob> {
  const { data, error } = await supabase.functions.invoke<RenderJob>('rerender-dream', {
    body: { dreamId, userId, newStyle },
  });
  if (error || !data) throw new Error(error?.message ?? 'Re-render failed.');
  return data;
}

// ─── Get video playback URL ────────────────────────────────────────────────────
export async function getDreamVideoUrl(
  userId: string,
  dreamId: string,
): Promise<string | null> {
  const path = `${userId}/${dreamId}/dreamscape.mp4`;
  const { data } = await supabase.storage
    .from(BUCKETS.dreamVideos)
    .createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

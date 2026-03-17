import { useState, useEffect, useRef } from 'react';
import { subscribeToRenderJob } from '@/services/renderService';
import { useDreamStore } from '@/stores/dreamStore';
import type { RenderJob } from '@/types';

export function useRenderJob(jobId: string | null, dreamId: string | null) {
  const [job, setJob] = useState<RenderJob | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const unsubRef = useRef<(() => void) | null>(null);
  const { updateDreamInList } = useDreamStore();

  useEffect(() => {
    if (!jobId || !dreamId) return;

    unsubRef.current = subscribeToRenderJob(
      jobId,
      (updatedJob) => setJob(updatedJob),
      (dId, url) => {
        setVideoUrl(url);
        updateDreamInList(dId, { renderStatus: 'complete', videoUrl: url });
      },
      (err) => setError(err),
    );

    return () => { unsubRef.current?.(); };
  }, [jobId, dreamId]);

  return { job, videoUrl, error, isComplete: !!videoUrl };
}

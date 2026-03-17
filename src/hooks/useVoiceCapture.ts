/**
 * useVoiceCapture — Primary hook for the Capture screen.
 * Manages recording lifecycle, waveform data, and transcription state.
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import {
  startRecording,
  stopRecording,
  detectEmotions,
  type RecordingSession,
  type TranscriptionResult,
} from '@/services/voiceService';
import { MAX_RECORDING_SECONDS } from '@/constants';
import type { DreamEmotion } from '@/types';

type CapturePhase = 'idle' | 'recording' | 'transcribing' | 'complete' | 'error';

interface UseVoiceCaptureReturn {
  phase: CapturePhase;
  durationSeconds: number;
  waveformData: number[];       // 0-1 amplitude values for visualization
  transcription: string;
  detectedEmotions: DreamEmotion[];
  error: string | null;
  startCapture: () => Promise<void>;
  stopCapture: () => Promise<TranscriptionResult | null>;
  reset: () => void;
}

export function useVoiceCapture(
  userId: string,
  dreamId: string,
): UseVoiceCaptureReturn {
  const [phase, setPhase] = useState<CapturePhase>('idle');
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [waveformData, setWaveformData] = useState<number[]>(Array(28).fill(0.1));
  const [transcription, setTranscription] = useState('');
  const [detectedEmotions, setDetectedEmotions] = useState<DreamEmotion[]>([]);
  const [error, setError] = useState<string | null>(null);

  const sessionRef = useRef<RecordingSession | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startCapture = useCallback(async () => {
    try {
      setPhase('recording');
      setError(null);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const session = await startRecording();
      sessionRef.current = session;

      // Update duration counter
      timerRef.current = setInterval(() => {
        setDurationSeconds(d => d + 1);
      }, 1000);

      // Simulate waveform from metering data
      session.recording.setOnRecordingStatusUpdate((status) => {
        if (status.metering != null) {
          // metering is -160 to 0 dBFS, normalize to 0-1
          const normalized = Math.max(0, (status.metering + 60) / 60);
          setWaveformData(prev => {
            const next = [...prev.slice(1), normalized];
            return next;
          });
        }
      });

      // Auto-stop at max duration
      autoStopRef.current = setTimeout(async () => {
        await stopCapture();
      }, MAX_RECORDING_SECONDS * 1000);

    } catch (err: unknown) {
      const e = err as { message?: string };
      setPhase('error');
      setError(e?.message ?? 'Recording failed. Please try again.');
    }
  }, [userId, dreamId]);

  const stopCapture = useCallback(async (): Promise<TranscriptionResult | null> => {
    if (!sessionRef.current) return null;

    // Clear timers
    if (timerRef.current) clearInterval(timerRef.current);
    if (autoStopRef.current) clearTimeout(autoStopRef.current);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      setPhase('transcribing');

      // Import here to avoid circular — in real app use dependency injection
      const { captureDream } = await import('@/services/voiceService');
      const result = await captureDream(sessionRef.current, userId, dreamId);

      setTranscription(result.text);
      setDetectedEmotions(result.emotions);
      setPhase('complete');
      sessionRef.current = null;
      return result;

    } catch (err: unknown) {
      const e = err as { message?: string };
      setPhase('error');
      setError(e?.message ?? 'Transcription failed. Your audio has been saved.');
      return null;
    }
  }, [userId, dreamId]);

  const reset = useCallback(() => {
    setPhase('idle');
    setDurationSeconds(0);
    setWaveformData(Array(28).fill(0.1));
    setTranscription('');
    setDetectedEmotions([]);
    setError(null);
    sessionRef.current = null;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (autoStopRef.current) clearTimeout(autoStopRef.current);
      if (sessionRef.current) {
        sessionRef.current.recording.stopAndUnloadAsync().catch(() => {});
      }
    };
  }, []);

  return {
    phase, durationSeconds, waveformData, transcription,
    detectedEmotions, error, startCapture, stopCapture, reset,
  };
}

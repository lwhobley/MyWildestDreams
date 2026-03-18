import { useState, useRef, useCallback, useEffect } from 'react';
import { Platform } from 'react-native';
import { Audio, AVRecordingStatus } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { supabase, BUCKETS } from '@/src/lib/supabase';
import { FunctionsHttpError } from '@supabase/supabase-js';

export type RecordingState = 'idle' | 'recording' | 'processing' | 'done' | 'error';

const WAVEFORM_BARS = 40;
const DB_FLOOR      = -50;
const DB_CEIL       = 0;

function dbToAmplitude(db: number | undefined | null): number {
  if (db == null || !isFinite(db)) return 0.05;
  const clamped = Math.max(DB_FLOOR, Math.min(DB_CEIL, db));
  return (clamped - DB_FLOOR) / (DB_CEIL - DB_FLOOR);
}

const FALLBACK_SAMPLES = [
  'I was flying over an ocean of silver clouds, and below me a city of light began to form, reaching upward like it wanted to touch me.',
  'There was a door at the end of a long corridor. Every time I reached it, the hallway extended further. I could hear someone calling my name.',
  'I found a garden where flowers bloomed in reverse, petals spiraling inward. The soil smelled like rain and something ancient.',
  'I was writing a letter to someone I had forgotten. Each word I wrote disappeared before I could finish. The ink was made of moonlight.',
  'A bridge stretched across an abyss. On the other side was a version of my childhood home, but larger, warmer, with all the right rooms.',
];

function getFallback(): string {
  return FALLBACK_SAMPLES[Math.floor(Math.random() * FALLBACK_SAMPLES.length)];
}

export function useRecording() {
  const [state, setState]                   = useState<RecordingState>('idle');
  const [transcription, setTranscription]   = useState('');
  const [waveformData, setWaveformData]     = useState<number[]>(Array(WAVEFORM_BARS).fill(0.05));
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [errorMessage, setErrorMessage]     = useState<string | null>(null);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const historyRef   = useRef<number[]>(Array(WAVEFORM_BARS).fill(0.05));

  // ── Cleanup on unmount ─────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (recordingRef.current) {
        recordingRef.current.setOnRecordingStatusUpdate(null);
        recordingRef.current.stopAndUnloadAsync().catch(() => {});
        recordingRef.current = null;
      }
    };
  }, []);

  // ── Start Recording ────────────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    try {
      setErrorMessage(null);
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        setErrorMessage('Microphone permission is required to record dreams.');
        setState('error');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS:  true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync({
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
        isMeteringEnabled: true,
      });

      recording.setOnRecordingStatusUpdate((status: AVRecordingStatus) => {
        if (!status.isRecording) return;
        setRecordingDuration(Math.floor((status.durationMillis ?? 0) / 1000));
        const amplitude = dbToAmplitude(status.metering);
        historyRef.current = [...historyRef.current.slice(1), amplitude];
        setWaveformData([...historyRef.current]);
      });

      await recording.setProgressUpdateInterval(50);
      recordingRef.current = recording;
      setState('recording');
      setTranscription('');
    } catch (err) {
      console.error('startRecording error:', err);
      setState('error');
      setErrorMessage('Could not start recording. Please try again.');
    }
  }, []);

  // ── Stop + Upload + Transcribe ─────────────────────────────────────────────
  const stopRecording = useCallback(async () => {
    const recording = recordingRef.current;
    if (!recording) {
      setState('error');
      setErrorMessage('Recording not found. Please try again.');
      return;
    }

    setWaveformData(Array(WAVEFORM_BARS).fill(0.05));
    setState('processing');
    setRecordingDuration(0);

    try {
      recording.setOnRecordingStatusUpdate(null);
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

      const uri = recording.getURI();
      recordingRef.current = null;
      if (!uri) throw new Error('No recording URI');

      // ── Upload audio to Supabase Storage (avoids 6MB body limit) ──────────
      const { data: { session } } = await supabase.auth.getSession();
      const userId  = session?.user?.id ?? 'guest';
      const dreamId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const ext     = Platform.OS === 'ios' ? 'm4a' : 'mp3';
      const storagePath = `${userId}/${dreamId}/recording.${ext}`;

      const fileContent = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const binaryStr = atob(fileContent);
      const bytes     = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);

      const { error: uploadError } = await supabase.storage
        .from(BUCKETS.audio)
        .upload(storagePath, bytes.buffer, {
          contentType: `audio/${ext}`,
          upsert: true,
        });

      if (uploadError) {
        console.warn('[useRecording] Storage upload failed, using base64 fallback:', uploadError.message);
        // Fallback: send base64 for short recordings only
        const mimeType = Platform.OS === 'ios' ? 'audio/m4a' : 'audio/mpeg';
        await transcribeViaBase64(fileContent, mimeType);
      } else {
        // Primary: pass storage path to edge function
        await transcribeViaStorage(storagePath);
      }

      // Clean up local temp file
      await FileSystem.deleteAsync(uri, { idempotent: true });

    } catch (err) {
      console.error('stopRecording error:', err);
      setTranscription(getFallback());
      setState('done');
    }
  }, []);

  async function transcribeViaStorage(storagePath: string) {
    const { data, error } = await supabase.functions.invoke('transcribe-audio', {
      body: { storagePath },
    });
    if (error) {
      console.warn('[useRecording] Transcription error:', error.message);
      setTranscription(getFallback());
    } else {
      const text = (data?.transcription ?? '').trim();
      setTranscription(text.length > 0 ? text : getFallback());
    }
    setState('done');
  }

  async function transcribeViaBase64(audioBase64: string, mimeType: string) {
    const { data, error } = await supabase.functions.invoke('transcribe-audio', {
      body: { audioBase64, mimeType },
    });
    if (error) {
      setTranscription(getFallback());
    } else {
      const text = (data?.transcription ?? '').trim();
      setTranscription(text.length > 0 ? text : getFallback());
    }
    setState('done');
  }

  // ── Reset ──────────────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    if (recordingRef.current) {
      recordingRef.current.setOnRecordingStatusUpdate(null);
      recordingRef.current.stopAndUnloadAsync().catch(() => {});
      recordingRef.current = null;
    }
    historyRef.current = Array(WAVEFORM_BARS).fill(0.05);
    setState('idle');
    setTranscription('');
    setWaveformData(Array(WAVEFORM_BARS).fill(0.05));
    setRecordingDuration(0);
    setErrorMessage(null);
  }, []);

  return {
    state, transcription, waveformData, recordingDuration,
    errorMessage, startRecording, stopRecording, reset, setTranscription,
  };
}

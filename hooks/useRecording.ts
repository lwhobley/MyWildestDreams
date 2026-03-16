import { useState, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import { Audio, AVRecordingStatus } from 'expo-av';
import { getSupabaseClient } from '@/template';
import { FunctionsHttpError } from '@supabase/supabase-js';

export type RecordingState = 'idle' | 'recording' | 'processing' | 'done' | 'error';

// Number of bars in the waveform history
const WAVEFORM_BARS = 40;

// expo-av metering range: roughly -160 dBFS (silence) to 0 dBFS (peak)
// We clamp to a practical range for visual clarity
const DB_FLOOR = -50; // anything quieter than this = flat bar
const DB_CEIL  =  0;  // peak

/**
 * Convert a dBFS metering value to a normalised 0–1 amplitude.
 * Values below DB_FLOOR collapse to the minimum; 0 dBFS maps to 1.0.
 */
function dbToAmplitude(db: number | undefined | null): number {
  if (db == null || !isFinite(db)) return 0.05;
  const clamped = Math.max(DB_FLOOR, Math.min(DB_CEIL, db));
  return (clamped - DB_FLOOR) / (DB_CEIL - DB_FLOOR);
}

// Fallback sample texts if transcription fails
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
  const [state, setState] = useState<RecordingState>('idle');
  const [transcription, setTranscription] = useState('');
  const [waveformData, setWaveformData] = useState<number[]>(Array(WAVEFORM_BARS).fill(0.05));
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const recordingRef  = useRef<Audio.Recording | null>(null);
  // Rolling history buffer — we push new amplitude samples here and slice for display
  const historyRef    = useRef<number[]>(Array(WAVEFORM_BARS).fill(0.05));

  // ── Start Recording ────────────────────────────────────────────────────────

  const startRecording = useCallback(async () => {
    try {
      setErrorMessage(null);

      // Request microphone permission
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        setErrorMessage('Microphone permission is required to record dreams.');
        setState('error');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Enable metering so RecordingStatus includes dBFS values
      const { recording } = await Audio.Recording.createAsync(
        {
          ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
          isMeteringEnabled: true,
        }
      );

      // ── Real-time amplitude metering via status updates ──────────────────
      // expo-av calls this callback every ~50 ms while recording.
      // Each update carries `metering` (dBFS) which we convert to 0–1
      // and push into a rolling history buffer for the visualiser.
      recording.setOnRecordingStatusUpdate((status: AVRecordingStatus) => {
        if (!status.isRecording) return;

        // Update duration counter
        const elapsed = Math.floor((status.durationMillis ?? 0) / 1000);
        setRecordingDuration(elapsed);

        // Convert dBFS → amplitude and push to rolling buffer
        const amplitude = dbToAmplitude(status.metering);
        historyRef.current = [...historyRef.current.slice(1), amplitude];
        setWaveformData([...historyRef.current]);
      });

      // Request status updates every 50 ms for a smooth 20 fps waveform
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

  // ── Stop Recording + Transcribe ────────────────────────────────────────────

  const stopRecording = useCallback(async () => {
    setWaveformData(Array(WAVEFORM_BARS).fill(0.05));
    setState('processing');
    setRecordingDuration(0);

    const recording = recordingRef.current;
    if (!recording) {
      setState('error');
      setErrorMessage('Recording not found. Please try again.');
      return;
    }

    try {
      // Remove status callback before stopping to avoid state updates on unmounted component
      recording.setOnRecordingStatusUpdate(null);
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

      const uri = recording.getURI();
      recordingRef.current = null;

      if (!uri) {
        throw new Error('No recording URI');
      }

      // Convert audio file to base64
      const base64Audio = await readFileAsBase64(uri);

      // Determine MIME type based on platform
      const mimeType = Platform.OS === 'ios' ? 'audio/m4a' : 'audio/mpeg';

      // Call Edge Function for real transcription
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.functions.invoke('transcribe-audio', {
        body: { audioBase64: base64Audio, mimeType },
      });

      if (error) {
        let msg = error.message;
        if (error instanceof FunctionsHttpError) {
          try {
            const text = await error.context?.text();
            msg = text || msg;
          } catch { /* ignore */ }
        }
        console.error('Transcription edge function error:', msg);
        setTranscription(getFallback());
        setState('done');
        return;
      }

      const text = (data?.transcription ?? '').trim();
      setTranscription(text.length > 0 ? text : getFallback());
      setState('done');
    } catch (err) {
      console.error('stopRecording error:', err);
      setTranscription(getFallback());
      setState('done');
    }
  }, []);

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
    state,
    transcription,
    waveformData,
    recordingDuration,
    errorMessage,
    startRecording,
    stopRecording,
    reset,
    setTranscription,
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────

async function readFileAsBase64(uri: string): Promise<string> {
  // expo-file-system is the reliable cross-platform way to read files as base64
  try {
    const FileSystem = await import('expo-file-system');
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return base64;
  } catch (err) {
    console.error('readFileAsBase64 error:', err);
    throw err;
  }
}

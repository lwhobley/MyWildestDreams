import { useState, useEffect, useRef, useCallback } from 'react';
import { Audio } from 'expo-av';

export type RecordingState = 'idle' | 'recording' | 'processing' | 'done' | 'error';

interface UseRecordingReturn {
  state: RecordingState;
  transcription: string;
  waveformData: number[];
  recordingDuration: number;
  errorMessage: string;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  reset: () => void;
  setTranscription: (text: string) => void;
}

export function useRecording(): UseRecordingReturn {
  const [state, setState] = useState<RecordingState>('idle');
  const [transcription, setTranscription] = useState('');
  const [waveformData, setWaveformData] = useState<number[]>(Array(40).fill(0.1));
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');

  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const waveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (waveTimerRef.current) clearInterval(waveTimerRef.current);
    };
  }, []);

  const startRecording = useCallback(async () => {
    try {
      setErrorMessage('');
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        setState('error');
        setErrorMessage('Microphone permission is required to record your dream.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setState('recording');
      setRecordingDuration(0);

      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);

      waveTimerRef.current = setInterval(() => {
        setWaveformData(
          Array.from({ length: 40 }, () => 0.1 + Math.random() * 0.9)
        );
      }, 100);
    } catch (err) {
      setState('error');
      setErrorMessage('Could not start recording. Please try again.');
    }
  }, []);

  const stopRecording = useCallback(async () => {
    if (!recordingRef.current) return;
    if (timerRef.current) clearInterval(timerRef.current);
    if (waveTimerRef.current) clearInterval(waveTimerRef.current);

    setState('processing');
    setWaveformData(Array(40).fill(0.1));

    try {
      await recordingRef.current.stopAndUnloadAsync();
      recordingRef.current = null;

      // Simulate transcription (replace with real STT integration)
      await new Promise((r) => setTimeout(r, 1500));
      setTranscription(
        'I was wandering through a vast crystalline city at twilight, where the buildings shifted like liquid glass. There was a sense of peaceful wonder as I floated through amber-lit corridors...'
      );
      setState('done');
    } catch {
      setState('error');
      setErrorMessage('Recording failed to process. Please try again.');
    }
  }, []);

  const reset = useCallback(() => {
    setState('idle');
    setTranscription('');
    setWaveformData(Array(40).fill(0.1));
    setRecordingDuration(0);
    setErrorMessage('');
    recordingRef.current = null;
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

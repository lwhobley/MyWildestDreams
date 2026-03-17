/**
 * Voice Capture Service
 * Priority 1: Core feature — records audio, transcribes via Whisper,
 * tags emotion/tone, and returns structured text for the render pipeline.
 */
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { supabase, BUCKETS, uploadFile } from '@/lib/supabase';
import { MAX_RECORDING_SECONDS, MIN_RECORDING_SECONDS } from '@/constants';
import type { DreamEmotion } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface RecordingSession {
  recording: Audio.Recording;
  startedAt: number;
}

export interface TranscriptionResult {
  text: string;
  durationSeconds: number;
  emotions: DreamEmotion[];
  wordCount: number;
  audioPath: string; // path in Supabase Storage
}

export interface VoiceServiceError {
  code: 'PERMISSION_DENIED' | 'RECORDING_FAILED' | 'TRANSCRIPTION_FAILED' | 'TOO_SHORT' | 'UPLOAD_FAILED';
  message: string;
}

// ─── Recording ────────────────────────────────────────────────────────────────
export async function requestMicrophonePermission(): Promise<boolean> {
  const { granted } = await Audio.requestPermissionsAsync();
  return granted;
}

export async function startRecording(): Promise<RecordingSession> {
  const hasPermission = await requestMicrophonePermission();
  if (!hasPermission) {
    throw { code: 'PERMISSION_DENIED', message: 'Microphone permission is required to capture dreams.' } as VoiceServiceError;
  }

  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
  });

  const { recording } = await Audio.Recording.createAsync(
    Audio.RecordingOptionsPresets.HIGH_QUALITY,
    undefined,
    100, // update interval ms for waveform visualization
  );

  return { recording, startedAt: Date.now() };
}

export async function stopRecording(session: RecordingSession): Promise<{
  uri: string;
  durationSeconds: number;
}> {
  await session.recording.stopAndUnloadAsync();
  await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

  const uri = session.recording.getURI();
  if (!uri) throw { code: 'RECORDING_FAILED', message: 'No audio file was created.' } as VoiceServiceError;

  const durationSeconds = (Date.now() - session.startedAt) / 1000;

  if (durationSeconds < MIN_RECORDING_SECONDS) {
    throw { code: 'TOO_SHORT', message: `Recording must be at least ${MIN_RECORDING_SECONDS} seconds.` } as VoiceServiceError;
  }

  return { uri, durationSeconds };
}

// ─── Upload ───────────────────────────────────────────────────────────────────
export async function uploadAudioToStorage(
  userId: string,
  dreamId: string,
  localUri: string,
): Promise<string> {
  const ext = localUri.split('.').pop() ?? 'm4a';
  const storagePath = `${userId}/${dreamId}/recording.${ext}`;
  const fileContent = await FileSystem.readAsStringAsync(localUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const blob = Buffer.from(fileContent, 'base64');
  const uploaded = await uploadFile(BUCKETS.audioRecordings, storagePath, blob, `audio/${ext}`);
  if (!uploaded) throw { code: 'UPLOAD_FAILED', message: 'Failed to upload audio.' } as VoiceServiceError;
  return storagePath;
}

// ─── Transcription (Whisper via Supabase Edge Function) ───────────────────────
export async function transcribeAudio(
  audioPath: string,
  userId: string,
): Promise<{ text: string; language: string }> {
  const { data, error } = await supabase.functions.invoke('transcribe-dream', {
    body: { audioPath, userId },
  });

  if (error) {
    throw {
      code: 'TRANSCRIPTION_FAILED',
      message: error.message ?? 'Transcription service unavailable.',
    } as VoiceServiceError;
  }

  return { text: data.text, language: data.language ?? 'en' };
}

// ─── Emotion Tagging ──────────────────────────────────────────────────────────
// Lightweight client-side scoring using keyword heuristics
// Full AI emotion analysis runs server-side in the dream parser
const EMOTION_KEYWORDS: Record<DreamEmotion, string[]> = {
  anxious:      ['chase', 'running', 'escape', 'trapped', 'late', 'lost', 'forgot', 'panic', 'falling'],
  euphoric:     ['flying', 'floating', 'joy', 'happy', 'dancing', 'free', 'light', 'soaring', 'laughing'],
  confused:     ['weird', 'strange', 'didn\'t make sense', 'suddenly', 'shift', 'changed', 'odd'],
  serene:       ['peaceful', 'calm', 'quiet', 'still', 'gentle', 'ocean', 'meadow', 'safe'],
  fearful:      ['monster', 'dark', 'shadow', 'threatening', 'danger', 'death', 'blood', 'violence'],
  curious:      ['explore', 'discover', 'door', 'new place', 'investigate', 'mysterious', 'wonder'],
  melancholic:  ['alone', 'missing', 'lost someone', 'sad', 'crying', 'grief', 'empty'],
  exhilarated:  ['fast', 'speed', 'adventure', 'exciting', 'incredible', 'amazing', 'rush'],
  unsettled:    ['uneasy', 'wrong', 'off', 'uncomfortable', 'disturbing', 'strange feeling'],
  peaceful:     ['garden', 'warm', 'home', 'family', 'love', 'content', 'rest', 'sunlight'],
};

export function detectEmotions(text: string): DreamEmotion[] {
  const lower = text.toLowerCase();
  const scores: Partial<Record<DreamEmotion, number>> = {};

  for (const [emotion, keywords] of Object.entries(EMOTION_KEYWORDS)) {
    const score = keywords.reduce((acc, kw) =>
      acc + (lower.includes(kw) ? 1 : 0), 0,
    );
    if (score > 0) scores[emotion as DreamEmotion] = score;
  }

  return Object.entries(scores)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([e]) => e as DreamEmotion);
}

// ─── Full Pipeline (orchestrates the above) ───────────────────────────────────
export async function captureDream(
  session: RecordingSession,
  userId: string,
  dreamId: string,
): Promise<TranscriptionResult> {
  // 1. Stop recording
  const { uri, durationSeconds } = await stopRecording(session);

  // 2. Upload audio
  const audioPath = await uploadAudioToStorage(userId, dreamId, uri);

  // 3. Transcribe
  const { text } = await transcribeAudio(audioPath, userId);

  // 4. Client-side emotion detection (fast, offline)
  const emotions = detectEmotions(text);

  // 5. Cleanup local file
  await FileSystem.deleteAsync(uri, { idempotent: true });

  return {
    text,
    durationSeconds,
    emotions,
    wordCount: text.trim().split(/\s+/).length,
    audioPath,
  };
}

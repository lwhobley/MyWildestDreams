// app/app/dream/capture.tsx
// ─── Dream Capture Screen · Voice Recording + Style Selection ─────────────────

import { useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Pressable, Alert,
} from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle, useSharedValue,
  withSpring, withTiming, interpolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useVoiceCapture } from '@/hooks/useVoiceCapture';
import { useCaptureStore, useAuthStore } from '@/stores';
import { supabase, uploadDreamAudio } from '@/lib/supabase/client';
import { runDreamPipeline } from '@/lib/video/renderPipeline';
import { Colors, Typography, VisualStyles, Spacing } from '@/theme/tokens';

const WAVEFORM_BARS = 30;

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export default function CaptureScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { selectedStyle, setStyle, setRenderStatus, setCurrentDreamId } = useCaptureStore();
  const {
    state, amplitude, durationMs,
    transcription, liveText, error,
    startRecording, stopRecording, reset,
  } = useVoiceCapture();

  const recordScale = useSharedValue(1);

  const isRecording = state === 'recording';
  const isDone = state === 'done';
  const isTranscribing = state === 'transcribing';

  const handleRecordPress = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    recordScale.value = withSpring(0.95, {}, () => {
      recordScale.value = withSpring(1);
    });

    if (state === 'idle') {
      await startRecording();
    } else if (state === 'recording') {
      await stopRecording();
    }
  }, [state, startRecording, stopRecording]);

  const handleGenerate = useCallback(async () => {
    if (!user || !transcription) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    try {
      // Create dream record
      const { data: dream, error: insertErr } = await supabase
        .from('dreams')
        .insert({
          user_id: user.id,
          raw_transcription: transcription,
          visual_style: selectedStyle,
          render_status: 'idle',
          render_progress: 0,
        })
        .select()
        .single();

      if (insertErr || !dream) throw insertErr;

      setCurrentDreamId(dream.id);

      // Navigate to rendering screen first
      router.push(`/app/dream/rendering?dreamId=${dream.id}`);

      // Start pipeline in background
      runDreamPipeline(
        dream.id,
        user.id,
        transcription,
        selectedStyle,
        (status, progress) => {
          setRenderStatus(status, progress);
          // Update Supabase realtime (rendering screen subscribes)
        },
      ).catch(err => {
        console.error('[Capture] pipeline error:', err);
      });

    } catch (err) {
      Alert.alert('Error', 'Failed to start dream generation. Please try again.');
    }
  }, [user, transcription, selectedStyle]);

  const recordBtnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: recordScale.value }],
  }));

  return (
    <LinearGradient
      colors={[Colors.abyss, Colors.void]}
      style={[styles.container, { paddingTop: insets.top }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={styles.statusRow}>
          {isRecording && <View style={styles.recDot} />}
          <Text style={[styles.statusText, isRecording && { color: Colors.rose }]}>
            {isDone ? 'Ready' : isRecording ? `Recording · ${formatDuration(durationMs)}` : isTranscribing ? 'Transcribing…' : 'Dream Capture'}
          </Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      {/* Waveform */}
      <View style={styles.waveform}>
        {Array.from({ length: WAVEFORM_BARS }, (_, i) => {
          const isActive = isRecording || isDone;
          const height = isActive
            ? Math.max(0.15, Math.sin(i * 0.4) * 0.5 + amplitude * 0.6 + 0.2)
            : 0.15;
          return (
            <View
              key={i}
              style={[
                styles.waveBar,
                {
                  height: `${height * 100}%`,
                  backgroundColor: isActive
                    ? `rgba(${i % 2 === 0 ? '78,205,196' : '199,125,255'}, ${0.5 + amplitude * 0.4})`
                    : 'rgba(255,255,255,0.08)',
                },
              ]}
            />
          );
        })}
      </View>

      {/* Transcription */}
      <View style={styles.transcriptionBox}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={styles.transcriptionText}>
            {isDone
              ? transcription
              : liveText || (isRecording ? 'Listening…' : 'Tap the button below to begin recording your dream.')}
          </Text>
          {isRecording && <Text style={[styles.cursor, { color: Colors.teal }]}>|</Text>}
        </ScrollView>
      </View>

      {/* Style Selector */}
      <View style={styles.styleSection}>
        <Text style={styles.styleLabel}>Visual Style</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.styleScroll}>
          {VisualStyles.map(s => (
            <Pressable
              key={s.id}
              onPress={() => { setStyle(s.id); Haptics.selectionAsync(); }}
              style={[
                styles.styleChip,
                selectedStyle === s.id && {
                  borderColor: s.color,
                  backgroundColor: `${s.color}18`,
                },
              ]}
            >
              <Text style={styles.styleEmoji}>{s.emoji}</Text>
              <Text style={[styles.styleText, selectedStyle === s.id && { color: s.color }]}>
                {s.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Record Button */}
      <View style={styles.actions}>
        {!isDone ? (
          <Animated.View style={recordBtnStyle}>
            <TouchableOpacity
              onPress={handleRecordPress}
              style={[styles.recordBtn, isRecording && styles.recordBtnActive]}
              disabled={isTranscribing}
            >
              <Text style={styles.recordIcon}>{isRecording ? '⏹' : '⏺'}</Text>
              <Text style={styles.recordLabel}>
                {isTranscribing ? 'Processing…' : isRecording ? 'Stop Recording' : 'Begin Recording'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        ) : (
          <TouchableOpacity onPress={handleGenerate} style={styles.generateBtn}>
            <LinearGradient
              colors={['rgba(123,94,167,0.5)', 'rgba(78,205,196,0.3)']}
              style={styles.generateGradient}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            >
              <Text style={styles.generateText}>Generate Dreamscape →</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {isDone && (
          <TouchableOpacity onPress={reset} style={styles.retakeBtn}>
            <Text style={styles.retakeText}>Re-record</Text>
          </TouchableOpacity>
        )}
      </View>

      {error && (
        <View style={[styles.errorBox, { bottom: insets.bottom + 20 }]}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing[6], paddingVertical: Spacing[4],
  },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  backIcon: { fontSize: 20, color: Colors.dim },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  recDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: Colors.rose },
  statusText: { fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: Colors.dim, fontFamily: Typography.label },
  waveform: {
    height: 60, flexDirection: 'row', alignItems: 'center',
    gap: 2, marginHorizontal: Spacing[6],
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 8,
  },
  waveBar: { flex: 1, borderRadius: 2, minHeight: 4 },
  transcriptionBox: {
    flex: 1, margin: Spacing[6], marginVertical: Spacing[4],
    backgroundColor: Colors.glass, borderWidth: 1, borderColor: Colors.glassBorder,
    padding: Spacing[4],
  },
  transcriptionText: {
    fontSize: 13, fontFamily: Typography.bodyLight, color: 'rgba(200,200,220,0.65)',
    lineHeight: 22,
  },
  cursor: { fontSize: 14 },
  styleSection: { paddingHorizontal: Spacing[6], marginBottom: Spacing[4] },
  styleLabel: {
    fontSize: 9, letterSpacing: 2.5, textTransform: 'uppercase',
    color: Colors.dim, fontFamily: Typography.label, marginBottom: Spacing[2],
  },
  styleScroll: { flexDirection: 'row' },
  styleChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 7, paddingHorizontal: 14, marginRight: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  styleEmoji: { fontSize: 14 },
  styleText: {
    fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase',
    color: Colors.dim, fontFamily: Typography.label,
  },
  actions: { padding: Spacing[6], gap: Spacing[3] },
  recordBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, padding: 16,
    backgroundColor: Colors.glass, borderWidth: 1, borderColor: Colors.glassBorder,
  },
  recordBtnActive: { borderColor: `${Colors.rose}55`, backgroundColor: 'rgba(199,125,255,0.08)' },
  recordIcon: { fontSize: 18 },
  recordLabel: {
    fontSize: 11, letterSpacing: 2, textTransform: 'uppercase',
    color: Colors.silver, fontFamily: Typography.label,
  },
  generateBtn: { overflow: 'hidden' },
  generateGradient: {
    padding: 16, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(199,125,255,0.45)',
  },
  generateText: {
    fontSize: 11, letterSpacing: 2, textTransform: 'uppercase',
    color: Colors.pure, fontFamily: Typography.label,
  },
  retakeBtn: { alignItems: 'center', padding: Spacing[2] },
  retakeText: { fontSize: 11, color: Colors.dim, fontFamily: Typography.label },
  errorBox: {
    position: 'absolute', left: Spacing[6], right: Spacing[6],
    backgroundColor: 'rgba(255,107,107,0.12)', borderWidth: 1,
    borderColor: 'rgba(255,107,107,0.3)', padding: Spacing[4],
  },
  errorText: { fontSize: 12, color: Colors.error, fontFamily: Typography.body },
});

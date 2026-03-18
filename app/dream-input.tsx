import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { WaveformVisualizer } from '@/components/ui/WaveformVisualizer';
import { StyleSelectorCarousel } from '@/components/ui/StyleSelectorCarousel';
import { DreamAnalysisCard, DreamAnalysis } from '@/components/ui/DreamAnalysisCard';
import { useRecording } from '@/hooks/useRecording';
import { analyzeDream, generateDreamImage, renderDreamscape } from '@/services/aiService';
import { useDreams } from '@/hooks/useDreams';
import { generateDreamId } from '@/services/dreamService';
import { Colors, Fonts, Spacing, Radius } from '@/constants/theme';
import { useAlert } from '@/template';

type InputMode = 'voice' | 'text';
type Step = 'input' | 'analyzing' | 'analysis' | 'rendering' | 'imaging';

export default function DreamInputScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { addDream } = useDreams();
  const { showAlert } = useAlert();
  const {
    state: recState, transcription, waveformData, recordingDuration, errorMessage,
    startRecording, stopRecording, reset, setTranscription,
  } = useRecording();

  const [inputMode, setInputMode] = useState<InputMode>('voice');
  const [selectedStyle, setSelectedStyle] = useState('surreal');
  const [step, setStep] = useState<Step>('input');
  const [analysis, setAnalysis] = useState<DreamAnalysis | null>(null);
  const [renderProgress, setRenderProgress] = useState(0);
  const [manualText, setManualText] = useState('');

  const progressAnim = useRef(new Animated.Value(0)).current;
  const analysisFadeAnim = useRef(new Animated.Value(0)).current;

  const effectiveText = inputMode === 'voice' ? transcription : manualText;
  const canAnalyze = effectiveText.trim().length > 10 && step === 'input';

  // ── Step 1: Analyze dream with AI ────────────────────────────────────────

  async function handleAnalyze() {
    if (!canAnalyze) return;
    setStep('analyzing');

    try {
      const result = await analyzeDream(effectiveText, selectedStyle);
      setAnalysis(result);
      setStep('analysis');

      Animated.timing(analysisFadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();
    } catch {
      showAlert('Analysis Failed', 'Could not reach the dream analysis portal. Please try again.');
      setStep('input');
    }
  }

  // ── Step 2: Render dreamscape ─────────────────────────────────────────────

  async function handleRender() {
    if (!analysis) return;
    setStep('rendering');
    setRenderProgress(0);

    try {
      // Step 2a: Simulate render progress
      const renderResult = await renderDreamscape(effectiveText, selectedStyle, (progress) => {
        setRenderProgress(progress * 0.7); // First 70% = render simulation
        Animated.timing(progressAnim, {
          toValue: progress * 0.7,
          duration: 300,
          useNativeDriver: false,
        }).start();
      });

      // Step 2b: Generate AI image (fills remaining 30% of progress)
      setStep('imaging');
      Animated.timing(progressAnim, {
        toValue: 0.85,
        duration: 600,
        useNativeDriver: false,
      }).start();

      const thumbnailUrl = await generateDreamImage(
        effectiveText,
        selectedStyle,
        analysis.title
      );

      Animated.timing(progressAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: false,
      }).start();

      const newDream = {
        id: generateDreamId(),
        title: analysis.title,
        description: effectiveText,
        styleId: selectedStyle,
        moodId: analysis.moodId,
        tags: analysis.tags,
        thumbnailIndex: renderResult.thumbnailIndex,
        thumbnailUrl: thumbnailUrl ?? undefined,
        interpretation: analysis.interpretation,
        createdAt: new Date().toISOString(),
        isFavorite: false,
        duration: renderResult.duration,
      };

      await addDream(newDream);

      router.replace({
        pathname: '/dream-playback',
        params: { dreamId: newDream.id },
      });
    } catch {
      showAlert('Rendering Failed', 'Something disrupted the dream portal. Please try again.');
      setStep('analysis');
    }
  }

  function handleBack() {
    if (step === 'analysis') {
      setStep('input');
      setAnalysis(null);
      analysisFadeAnim.setValue(0);
    } else {
      router.back();
    }
  }

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const headerTitle =
    step === 'input' ? 'Capture Dream' :
    step === 'analyzing' ? 'Analysing...' :
    step === 'analysis' ? 'Dream Analysis' :
    step === 'imaging' ? 'Generating Image...' :
    'Rendering Dreamscape';

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.root}
    >
      <StatusBar style="light" />
      <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={handleBack} hitSlop={12} style={styles.backBtn}>
            <MaterialIcons name="arrow-back-ios" size={20} color={Colors.textSecondary} />
          </Pressable>
          <Text style={styles.headerTitle}>{headerTitle}</Text>
          <View style={{ width: 32 }} />
        </View>

        {/* Step indicator */}
        <View style={styles.stepRow}>
          {(['input', 'analysis', 'rendering'] as const).map((s, i) => (
            <View key={s} style={styles.stepItem}>
              <View
                style={[
                  styles.stepDot,
                  (step === s || (step === 'analyzing' && s === 'analysis') || (step === 'rendering' && i <= 2))
                    ? styles.stepDotActive : {},
                  step === 'input' && i === 0 ? styles.stepDotCurrent : {},
                  (step === 'analysis' || step === 'analyzing') && i === 1 ? styles.stepDotCurrent : {},
                  step === 'rendering' && i === 2 ? styles.stepDotCurrent : {},
                ]}
              >
                <Text style={styles.stepDotNum}>{i + 1}</Text>
              </View>
              {i < 2 ? <View style={[styles.stepLine, i === 0 && step !== 'input' ? styles.stepLineActive : {}]} /> : null}
            </View>
          ))}
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scroll}
        >
          {/* ── STEP: INPUT ─────────────────────────────────────────────── */}
          {step === 'input' ? (
            <>
              {/* Mode toggle */}
              <View style={styles.modeToggle}>
                <Pressable
                  onPress={() => setInputMode('voice')}
                  style={[styles.modeBtn, inputMode === 'voice' && styles.modeBtnActive]}
                >
                  <MaterialIcons name="mic" size={18} color={inputMode === 'voice' ? Colors.accent : Colors.textSubtle} />
                  <Text style={[styles.modeBtnText, inputMode === 'voice' && styles.modeBtnTextActive]}>Voice</Text>
                </Pressable>
                <Pressable
                  onPress={() => setInputMode('text')}
                  style={[styles.modeBtn, inputMode === 'text' && styles.modeBtnActive]}
                >
                  <MaterialIcons name="edit" size={18} color={inputMode === 'text' ? Colors.accent : Colors.textSubtle} />
                  <Text style={[styles.modeBtnText, inputMode === 'text' && styles.modeBtnTextActive]}>Text</Text>
                </Pressable>
              </View>

              {inputMode === 'voice' ? (
                <View style={styles.voiceSection}>
                  <View style={styles.waveformBox}>
                    <WaveformVisualizer data={waveformData} isActive={recState === 'recording'} height={80} />
                    {recState === 'processing' ? (
                      <View style={styles.processingOverlay}>
                        <ActivityIndicator color={Colors.accent} />
                        <Text style={styles.processingText}>Transcribing your dream...</Text>
                      </View>
                    ) : null}
                  </View>

                  {recState === 'recording' ? (
                    <View style={styles.recIndicator}>
                      <View style={styles.recDot} />
                      <Text style={styles.recTime}>
                        {Math.floor(recordingDuration / 60).toString().padStart(2, '0')}:
                        {(recordingDuration % 60).toString().padStart(2, '0')}
                      </Text>
                    </View>
                  ) : null}

                  <View style={styles.voiceActions}>
                    {recState === 'idle' || recState === 'error' ? (
                      <Pressable
                        onPress={startRecording}
                        style={({ pressed }) => [styles.recordBtn, pressed && styles.btnPressed]}
                      >
                        <MaterialIcons name="mic" size={28} color={Colors.textPrimary} />
                        <Text style={styles.recordBtnText}>Hold to Record</Text>
                      </Pressable>
                    ) : recState === 'recording' ? (
                      <Pressable
                        onPress={stopRecording}
                        style={({ pressed }) => [styles.stopBtn, pressed && styles.btnPressed]}
                      >
                        <MaterialIcons name="stop" size={28} color={Colors.textPrimary} />
                        <Text style={styles.recordBtnText}>Stop Recording</Text>
                      </Pressable>
                    ) : null}
                    {recState === 'done' ? (
                      <Pressable onPress={reset} hitSlop={12}>
                        <Text style={styles.retryText}>Record Again</Text>
                      </Pressable>
                    ) : null}
                    {recState === 'error' && errorMessage ? (
                      <View style={styles.errorBanner}>
                        <MaterialIcons name="error-outline" size={16} color={Colors.error} />
                        <Text style={styles.errorBannerText}>{errorMessage}</Text>
                      </View>
                    ) : null}
                  </View>

                  {transcription.length > 0 ? (
                    <View style={styles.transcriptBox}>
                      <Text style={styles.transcriptLabel}>Transcription</Text>
                      <Text style={styles.transcriptText}>{transcription}</Text>
                    </View>
                  ) : null}
                </View>
              ) : (
                <View style={styles.textSection}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Describe your dream in detail... what did you see, feel, hear?"
                    placeholderTextColor={Colors.textSubtle}
                    value={manualText}
                    onChangeText={setManualText}
                    multiline
                    textAlignVertical="top"
                  />
                  <Text style={styles.charCount}>{manualText.length} characters</Text>
                </View>
              )}

              {/* Style selector */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Choose Aesthetic</Text>
                <StyleSelectorCarousel selectedId={selectedStyle} onSelect={setSelectedStyle} />
              </View>

              {/* Analyse button */}
              <Pressable
                onPress={handleAnalyze}
                disabled={!canAnalyze}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  !canAnalyze && styles.primaryBtnDisabled,
                  pressed && canAnalyze && styles.btnPressed,
                ]}
              >
                <MaterialIcons name="psychology" size={20} color={canAnalyze ? Colors.textPrimary : Colors.textSubtle} />
                <Text style={[styles.primaryBtnText, !canAnalyze && styles.primaryBtnTextDisabled]}>
                  Analyse Dream
                </Text>
              </Pressable>

              <Text style={styles.disclaimer}>
                AI-powered analysis · Your dream data stays private
              </Text>
            </>
          ) : null}

          {/* ── STEP: ANALYSING ─────────────────────────────────────────── */}
          {step === 'analyzing' ? (
            <View style={styles.analyzingContainer}>
              <View style={styles.analyzingInner}>
                <ActivityIndicator size="large" color={Colors.accent} />
                <Text style={styles.analyzingTitle}>Reading your dreamscape...</Text>
                <Text style={styles.analyzingSubtitle}>
                  Extracting emotional tone, symbols, archetypes and narrative flow
                </Text>
                <View style={styles.analyzingSteps}>
                  {[
                    'Parsing narrative structure',
                    'Identifying Jungian archetypes',
                    'Mapping emotional resonance',
                    'Surfacing shadow elements',
                  ].map((label, i) => (
                    <View key={i} style={styles.analyzingStep}>
                      <View style={styles.analyzingStepDot} />
                      <Text style={styles.analyzingStepText}>{label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          ) : null}

          {/* ── STEP: ANALYSIS ──────────────────────────────────────────── */}
          {step === 'analysis' && analysis ? (
            <>
              <Text style={styles.analysisIntro}>
                The subconscious has spoken. Here is what lies within your dream.
              </Text>
              <DreamAnalysisCard analysis={analysis} fadeAnim={analysisFadeAnim} />

              <Pressable
                onPress={handleRender}
                style={({ pressed }) => [styles.primaryBtn, pressed && styles.btnPressed]}
              >
                <MaterialIcons name="auto-awesome" size={20} color={Colors.textPrimary} />
                <Text style={styles.primaryBtnText}>Render Dreamscape</Text>
              </Pressable>

              <Pressable
                onPress={() => { setStep('input'); setAnalysis(null); analysisFadeAnim.setValue(0); }}
                style={({ pressed }) => [styles.secondaryBtn, pressed && styles.btnPressed]}
              >
                <MaterialIcons name="refresh" size={18} color={Colors.textSubtle} />
                <Text style={styles.secondaryBtnText}>Edit Description</Text>
              </Pressable>
            </>
          ) : null}

          {/* ── STEP: RENDERING ─────────────────────────────────────────── */}
          {(step === 'rendering' || step === 'imaging') ? (
            <View style={styles.renderingContainer}>
              <ActivityIndicator size="large" color={Colors.accent} />
              <Text style={styles.renderingTitle}>
                {step === 'imaging' ? 'Generating AI Thumbnail' : 'Rendering Dreamscape'}
              </Text>
              <Text style={styles.renderingPct}>{Math.round(renderProgress * 100)}%</Text>
              <View style={styles.progressTrack}>
                <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
              </View>
              <Text style={styles.renderingHint}>
                {step === 'imaging'
                  ? 'Creating a unique cinematic image from your dream...'
                  : 'Weaving light, colour, and meaning into your dream...'}
              </Text>
            </View>
          ) : null}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  backBtn: { padding: Spacing.xs },
  headerTitle: {
    color: Colors.textPrimary,
    fontSize: Fonts.sizes.lg,
    fontWeight: Fonts.weights.semibold,
  },

  // Step indicator
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
    gap: 0,
  },
  stepItem: { flexDirection: 'row', alignItems: 'center' },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.accent,
  },
  stepDotCurrent: {
    backgroundColor: Colors.primary,
    borderColor: Colors.accent,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 6,
  },
  stepDotNum: {
    color: Colors.textPrimary,
    fontSize: Fonts.sizes.xs,
    fontWeight: Fonts.weights.bold,
  },
  stepLine: {
    width: 48,
    height: 1,
    backgroundColor: Colors.border,
  },
  stepLineActive: { backgroundColor: Colors.accent },

  scroll: { paddingHorizontal: Spacing.lg, paddingBottom: 48, gap: Spacing.lg },

  // Input step
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.full,
    padding: 3,
    borderWidth: 1,
    borderColor: Colors.border,
    alignSelf: 'center',
  },
  modeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.full,
    gap: Spacing.xs,
  },
  modeBtnActive: { backgroundColor: Colors.primary },
  modeBtnText: { color: Colors.textSubtle, fontSize: Fonts.sizes.md, fontWeight: Fonts.weights.medium },
  modeBtnTextActive: { color: Colors.textPrimary },
  voiceSection: { gap: Spacing.md },
  waveformBox: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    alignItems: 'center',
    minHeight: 120,
    justifyContent: 'center',
  },
  processingOverlay: {
    marginTop: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  processingText: { color: Colors.textSecondary, fontSize: Fonts.sizes.sm },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    backgroundColor: 'rgba(204,68,102,0.12)', borderRadius: Radius.md,
    borderWidth: 1, borderColor: 'rgba(204,68,102,0.35)',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
  },
  errorBannerText: {
    flex: 1, color: Colors.error, fontSize: Fonts.sizes.sm, lineHeight: Fonts.sizes.sm * 1.5,
  },
  recIndicator: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  recDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.error },
  recTime: { color: Colors.error, fontSize: Fonts.sizes.md, fontWeight: Fonts.weights.semibold },
  voiceActions: { alignItems: 'center', gap: Spacing.md },
  recordBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.primary, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md,
    borderRadius: Radius.full, gap: Spacing.sm,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 16, elevation: 8,
  },
  stopBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.error, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md,
    borderRadius: Radius.full, gap: Spacing.sm,
    shadowColor: Colors.error, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  recordBtnText: { color: Colors.textPrimary, fontSize: Fonts.sizes.md, fontWeight: Fonts.weights.semibold },
  retryText: { color: Colors.textSubtle, fontSize: Fonts.sizes.sm, fontWeight: Fonts.weights.medium, textDecorationLine: 'underline' },
  transcriptBox: {
    backgroundColor: Colors.surfaceElevated, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.borderBright, padding: Spacing.md, gap: Spacing.xs,
  },
  transcriptLabel: { color: Colors.accent, fontSize: Fonts.sizes.xs, fontWeight: Fonts.weights.semibold, textTransform: 'uppercase', letterSpacing: 1.5 },
  transcriptText: { color: Colors.textPrimary, fontSize: Fonts.sizes.md, lineHeight: Fonts.sizes.md * 1.7 },
  textSection: { gap: Spacing.xs },
  textInput: {
    backgroundColor: Colors.surfaceElevated, borderRadius: Radius.md, borderWidth: 1,
    borderColor: Colors.border, padding: Spacing.md, color: Colors.textPrimary,
    fontSize: Fonts.sizes.md, lineHeight: Fonts.sizes.md * 1.7, minHeight: 160,
  },
  charCount: { color: Colors.textSubtle, fontSize: Fonts.sizes.xs, textAlign: 'right' },
  section: { gap: Spacing.sm },
  sectionTitle: { color: Colors.textSecondary, fontSize: Fonts.sizes.sm, fontWeight: Fonts.weights.semibold, textTransform: 'uppercase', letterSpacing: 1.5 },

  // Analyzing step
  analyzingContainer: { paddingTop: Spacing.xxl, alignItems: 'center' },
  analyzingInner: { alignItems: 'center', gap: Spacing.lg, maxWidth: 300 },
  analyzingTitle: { color: Colors.textPrimary, fontSize: Fonts.sizes.xl, fontWeight: Fonts.weights.bold, textAlign: 'center' },
  analyzingSubtitle: { color: Colors.textSubtle, fontSize: Fonts.sizes.sm, textAlign: 'center', lineHeight: Fonts.sizes.sm * 1.7 },
  analyzingSteps: { gap: Spacing.sm, alignSelf: 'stretch' },
  analyzingStep: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  analyzingStepDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.accent },
  analyzingStepText: { color: Colors.textSecondary, fontSize: Fonts.sizes.sm },

  // Analysis step
  analysisIntro: {
    color: Colors.textSubtle, fontSize: Fonts.sizes.sm, fontStyle: 'italic',
    textAlign: 'center', lineHeight: Fonts.sizes.sm * 1.7,
  },

  // Rendering step
  renderingContainer: { paddingTop: Spacing.xxl, alignItems: 'center', gap: Spacing.lg },
  renderingTitle: { color: Colors.textPrimary, fontSize: Fonts.sizes.xl, fontWeight: Fonts.weights.bold },
  renderingPct: { color: Colors.accent, fontSize: Fonts.sizes.xxxl ?? 40, fontWeight: Fonts.weights.bold },
  progressTrack: { width: '100%', height: 4, backgroundColor: Colors.surfaceElevated, borderRadius: Radius.full, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Colors.accent, borderRadius: Radius.full },
  renderingHint: { color: Colors.textSubtle, fontSize: Fonts.sizes.sm, textAlign: 'center', fontStyle: 'italic' },

  // Shared buttons
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primary, paddingVertical: Spacing.md + 2,
    borderRadius: Radius.xl, gap: Spacing.sm,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 20, elevation: 12,
  },
  primaryBtnDisabled: { backgroundColor: Colors.surfaceElevated, shadowOpacity: 0, elevation: 0 },
  primaryBtnText: { color: Colors.textPrimary, fontSize: Fonts.sizes.lg, fontWeight: Fonts.weights.bold },
  primaryBtnTextDisabled: { color: Colors.textSubtle },
  secondaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.surfaceElevated, paddingVertical: Spacing.md,
    borderRadius: Radius.xl, gap: Spacing.sm, borderWidth: 1, borderColor: Colors.border,
  },
  secondaryBtnText: { color: Colors.textSubtle, fontSize: Fonts.sizes.md, fontWeight: Fonts.weights.medium },
  btnPressed: { opacity: 0.85, transform: [{ scale: 0.97 }] },
  disclaimer: { color: Colors.textSubtle, fontSize: Fonts.sizes.xs, textAlign: 'center', letterSpacing: 0.3 },
});

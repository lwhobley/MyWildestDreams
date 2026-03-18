/**
 * Dream Input Screen — type or voice record your dream
 */
import { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, Pressable, TextInput,
  ScrollView, Animated, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { Colors, Fonts, Spacing, Radius } from '@/constants/theme';
import { DREAM_STYLES } from '@/constants/config';

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '';

const MIN_CHARS = 20;

type InputMode = 'text' | 'voice';
type RecordState = 'idle' | 'recording' | 'processing';

export default function InputScreen() {
  const router = useRouter();
  const [mode, setMode]             = useState<InputMode>('text');
  const [text, setText]             = useState('');
  const [selectedStyle, setStyle]   = useState(DREAM_STYLES[0].id);
  const [loading, setLoading]       = useState(false);
  const [recordState, setRecordState] = useState<RecordState>('idle');
  const recordingRef = useRef<Audio.Recording | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  // Mic pulse animation
  useEffect(() => {
    if (recordState === 'recording') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.2, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1,   duration: 800, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [recordState]);

  // ── Voice recording ────────────────────────────────────────────────────────
  async function toggleRecording() {
    if (recordState === 'recording') {
      await stopRecording();
    } else {
      await startRecording();
    }
  }

  async function startRecording() {
    try {
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) { Alert.alert('Microphone permission required'); return; }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setRecordState('recording');
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {
      Alert.alert('Could not start recording');
    }
  }

  async function stopRecording() {
    const rec = recordingRef.current;
    if (!rec) return;
    setRecordState('processing');
    await rec.stopAndUnloadAsync();
    await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
    const uri = rec.getURI();
    recordingRef.current = null;
    if (!uri) { setRecordState('idle'); return; }
    await transcribeAudio(uri);
  }

  async function transcribeAudio(uri: string) {
    try {
      // Read as base64 and send to Gemini
      const FileSystem = await import('expo-file-system');
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              role: 'user',
              parts: [
                { text: 'Transcribe this dream description audio exactly as spoken. Return only the transcribed text, nothing else.' },
                { inlineData: { mimeType: 'audio/mp4', data: base64 } },
              ],
            }],
            generationConfig: { temperature: 0 },
          }),
        }
      );
      const data = await res.json();
      const transcribed = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';
      if (transcribed) setText(prev => prev ? `${prev} ${transcribed}` : transcribed);
      setRecordState('idle');
      setMode('text'); // Switch to text so user can edit
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      setRecordState('idle');
      Alert.alert('Transcription failed', 'Please type your dream instead.');
    }
  }

  // ── Interpret ──────────────────────────────────────────────────────────────
  async function interpret() {
    if (text.trim().length < MIN_CHARS) {
      Alert.alert('Tell us more', `Please describe your dream in at least ${MIN_CHARS} characters.`);
      return;
    }
    setLoading(true);
    try {
      const style = DREAM_STYLES.find(s => s.id === selectedStyle);
      const prompt = buildPrompt(text.trim(), style?.label ?? 'Cosmic');

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.85,
              responseMimeType: 'application/json',
            },
          }),
        }
      );

      const data = await res.json();
      const raw  = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const reading = JSON.parse(clean);

      router.push({ pathname: '/reading', params: { reading: JSON.stringify(reading), dream: text.trim() } });
    } catch (e) {
      Alert.alert('Interpretation failed', 'Check your API key or try again.');
    } finally {
      setLoading(false);
    }
  }

  const canSubmit = text.trim().length >= MIN_CHARS && !loading;
  const charCount = text.trim().length;

  return (
    <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar style="light" />
      <LinearGradient colors={[Colors.backgroundDeep, Colors.background]} style={StyleSheet.absoluteFill} />

      <Animated.View style={[s.container, { opacity: fadeAnim }]}>
        {/* Header */}
        <View style={s.header}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={s.backBtn}>
            <Text style={s.backText}>← Back</Text>
          </Pressable>
          <Text style={s.headerTitle}>Describe Your Dream</Text>
          <View style={{ width: 60 }} />
        </View>

        {/* Mode toggle */}
        <View style={s.modeToggle}>
          {(['text', 'voice'] as InputMode[]).map(m => (
            <Pressable key={m} onPress={() => setMode(m)} style={[s.modeBtn, mode === m && s.modeBtnActive]}>
              <Text style={[s.modeBtnText, mode === m && s.modeBtnTextActive]}>
                {m === 'text' ? '✏️  Type' : '🎙️  Voice'}
              </Text>
            </Pressable>
          ))}
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

          {/* Text input */}
          {mode === 'text' && (
            <View style={s.inputWrap}>
              <TextInput
                style={s.input}
                placeholder="I was standing in a forest made of glass, the moon was speaking to me in a language I almost understood..."
                placeholderTextColor={Colors.textSubtle}
                multiline
                value={text}
                onChangeText={setText}
                autoFocus
                scrollEnabled={false}
              />
              <Text style={[s.charCount, charCount >= MIN_CHARS && s.charCountOk]}>
                {charCount} {charCount < MIN_CHARS ? `/ ${MIN_CHARS} min` : '✓'}
              </Text>
            </View>
          )}

          {/* Voice input */}
          {mode === 'voice' && (
            <View style={s.voiceWrap}>
              <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                <Pressable onPress={toggleRecording} style={[s.micBtn, recordState === 'recording' && s.micBtnActive]}>
                  <LinearGradient
                    colors={recordState === 'recording'
                      ? ['rgba(255,107,138,0.8)', 'rgba(204,68,102,0.6)']
                      : [Colors.primary, Colors.primaryDark]}
                    style={s.micGradient}
                  >
                    {recordState === 'processing'
                      ? <ActivityIndicator color={Colors.textPrimary} size="large" />
                      : <Text style={s.micIcon}>{recordState === 'recording' ? '⏹' : '🎙️'}</Text>
                    }
                  </LinearGradient>
                </Pressable>
              </Animated.View>
              <Text style={s.micLabel}>
                {recordState === 'idle'     ? 'Tap to speak your dream'   : ''}
                {recordState === 'recording'? 'Listening… tap to stop'    : ''}
                {recordState === 'processing'? 'Transcribing…'            : ''}
              </Text>
              {text.length > 0 && (
                <View style={s.transcriptBox}>
                  <Text style={s.transcriptLabel}>Transcribed</Text>
                  <Text style={s.transcriptText}>{text}</Text>
                  <Pressable onPress={() => setText('')}>
                    <Text style={s.clearText}>Clear</Text>
                  </Pressable>
                </View>
              )}
            </View>
          )}

          {/* Style selector */}
          <View style={s.styleSection}>
            <Text style={s.sectionLabel}>INTERPRETATION LENS</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.styleScroll}>
              {DREAM_STYLES.map(style => (
                <Pressable
                  key={style.id}
                  onPress={() => setStyle(style.id)}
                  style={[s.styleChip, selectedStyle === style.id && { borderColor: style.color, backgroundColor: style.bgColor }]}
                >
                  <Text style={s.styleEmoji}>{style.emoji}</Text>
                  <Text style={[s.styleLabel, selectedStyle === style.id && { color: style.color }]}>
                    {style.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          <View style={{ height: 120 }} />
        </ScrollView>

        {/* Submit */}
        <View style={s.submitWrap}>
          <Pressable
            onPress={interpret}
            disabled={!canSubmit}
            style={({ pressed }) => [s.submitBtn, !canSubmit && s.submitDisabled, pressed && s.submitPressed]}
          >
            {loading
              ? <ActivityIndicator color={Colors.textPrimary} />
              : <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={s.submitGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  <Text style={s.submitText}>✦  Reveal the Meaning</Text>
                </LinearGradient>
            }
          </Pressable>
        </View>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

function buildPrompt(dream: string, lens: string): string {
  return `You are a cosmic dream oracle — part Jungian analyst, part astrologer, part mystic. 
Interpret the following dream with deep symbolic wisdom. The lens for this reading is: ${lens}.

Dream: "${dream}"

Respond ONLY with valid JSON in exactly this structure:
{
  "title": "A poetic 4-7 word title for this dream",
  "overallMeaning": "2-3 sentences of rich, cosmic overall interpretation",
  "cosmicMessage": "One powerful sentence — the universe's direct message to the dreamer",
  "symbols": [
    { "symbol": "name", "emoji": "emoji", "meaning": "2-3 sentence Jungian/cosmic meaning" }
  ],
  "emotionalTone": {
    "primary": "dominant emotion",
    "secondary": "undertone emotion",
    "intensity": "Whisper | Murmur | Storm | Thunder"
  },
  "archetype": {
    "name": "Jungian archetype name",
    "description": "How this archetype manifests in this dream"
  },
  "shadowElement": "What the dream reveals about the dreamer's shadow self",
  "cosmicTiming": "Astrological or cosmic context — what this dream is aligned with",
  "affirmation": "A one-sentence empowering affirmation drawn from the dream's meaning",
  "tags": ["tag1", "tag2", "tag3", "tag4"]
}

symbols: exactly 3-5 items. tags: 4-6 lowercase single words. No markdown, no explanation outside JSON.`;
}

const s = StyleSheet.create({
  root:       { flex: 1, backgroundColor: Colors.background },
  container:  { flex: 1 },
  scroll:     { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },

  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingTop: 60, paddingBottom: Spacing.lg },
  backBtn:        {},
  backText:       { color: Colors.accent, fontSize: Fonts.sizes.md },
  headerTitle:    { fontSize: Fonts.sizes.lg, fontWeight: Fonts.weights.semibold, color: Colors.textPrimary },

  modeToggle:     { flexDirection: 'row', marginHorizontal: Spacing.lg, marginBottom: Spacing.lg, backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: 4 },
  modeBtn:        { flex: 1, paddingVertical: Spacing.sm + 2, alignItems: 'center', borderRadius: Radius.lg },
  modeBtnActive:  { backgroundColor: Colors.primary },
  modeBtnText:    { fontSize: Fonts.sizes.sm, color: Colors.textSubtle, fontWeight: Fonts.weights.medium },
  modeBtnTextActive: { color: Colors.textPrimary },

  inputWrap:      { backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.lg },
  input:          { padding: Spacing.md, fontSize: Fonts.sizes.md, color: Colors.textPrimary, lineHeight: 24, minHeight: 180, textAlignVertical: 'top' },
  charCount:      { textAlign: 'right', paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm, fontSize: Fonts.sizes.xs, color: Colors.textSubtle },
  charCountOk:    { color: Colors.success },

  voiceWrap:      { alignItems: 'center', gap: Spacing.lg, paddingVertical: Spacing.xl },
  micBtn:         { width: 120, height: 120, borderRadius: 60, overflow: 'hidden', shadowColor: Colors.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.7, shadowRadius: 24, elevation: 16 },
  micBtnActive:   { shadowColor: Colors.error },
  micGradient:    { flex: 1, alignItems: 'center', justifyContent: 'center' },
  micIcon:        { fontSize: 40 },
  micLabel:       { fontSize: Fonts.sizes.md, color: Colors.textSubtle, fontStyle: 'italic', textAlign: 'center' },
  transcriptBox:  { width: '100%', backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, gap: Spacing.sm },
  transcriptLabel:{ fontSize: Fonts.sizes.xs, letterSpacing: 2, color: Colors.accent },
  transcriptText: { fontSize: Fonts.sizes.md, color: Colors.textPrimary, lineHeight: 22 },
  clearText:      { fontSize: Fonts.sizes.sm, color: Colors.error, textAlign: 'right' },

  styleSection:   { marginBottom: Spacing.lg },
  sectionLabel:   { fontSize: 10, letterSpacing: 3, color: Colors.textSubtle, marginBottom: Spacing.sm },
  styleScroll:    { gap: Spacing.sm, paddingRight: Spacing.lg },
  styleChip:      { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  styleEmoji:     { fontSize: 16 },
  styleLabel:     { fontSize: Fonts.sizes.sm, color: Colors.textSecondary, fontWeight: Fonts.weights.medium },

  submitWrap:     { position: 'absolute', bottom: 0, left: 0, right: 0, padding: Spacing.lg, paddingBottom: Spacing.xl, backgroundColor: 'transparent' },
  submitBtn:      { borderRadius: Radius.xl, overflow: 'hidden', shadowColor: Colors.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 20, elevation: 12 },
  submitDisabled: { opacity: 0.4, shadowOpacity: 0 },
  submitPressed:  { opacity: 0.85, transform: [{ scale: 0.98 }] },
  submitGradient: { paddingVertical: Spacing.md + 2, alignItems: 'center' },
  submitText:     { fontSize: Fonts.sizes.lg, fontWeight: Fonts.weights.bold, color: Colors.textPrimary, letterSpacing: 0.5 },
});

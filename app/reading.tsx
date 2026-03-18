/**
 * Reading Screen — full cosmic interpretation result
 */
import { useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  Animated, Share, Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Colors, Fonts, Spacing, Radius, Shadow } from '@/constants/theme';

const { width } = Dimensions.get('window');

interface DreamReading {
  title: string;
  overallMeaning: string;
  cosmicMessage: string;
  symbols: { symbol: string; emoji: string; meaning: string }[];
  emotionalTone: { primary: string; secondary: string; intensity: string };
  archetype: { name: string; description: string };
  shadowElement: string;
  cosmicTiming: string;
  affirmation: string;
  tags: string[];
}

const INTENSITY_COLORS: Record<string, string> = {
  Whisper: '#6BB5FF',
  Murmur:  '#6ECFB0',
  Storm:   '#C4A8FF',
  Thunder: '#FF6B8A',
};

export default function ReadingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ reading: string; dream: string }>();
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(60)).current;

  let reading: DreamReading | null = null;
  try { reading = JSON.parse(params.reading ?? '{}'); } catch { }

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 700, delay: 100, useNativeDriver: true }),
    ]).start();
  }, []);

  async function handleShare() {
    if (!reading) return;
    await Share.share({
      message: `✦ My Wildest Dreams Oracle\n\n"${params.dream}"\n\n${reading.cosmicMessage}\n\n— ${reading.affirmation}`,
      title: reading.title,
    });
  }

  if (!reading) {
    return (
      <View style={[s.root, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={s.errorText}>Could not load reading.</Text>
        <Pressable onPress={() => router.back()} style={s.backPill}>
          <Text style={s.backPillText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const intensityColor = INTENSITY_COLORS[reading.emotionalTone?.intensity] ?? Colors.accent;

  return (
    <View style={s.root}>
      <StatusBar style="light" />
      <LinearGradient colors={[Colors.backgroundDeep, Colors.background]} style={StyleSheet.absoluteFill} />

      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={s.backText}>✕</Text>
        </Pressable>
        <Text style={s.headerLabel}>COSMIC READING</Text>
        <Pressable onPress={handleShare} hitSlop={12}>
          <Text style={s.shareText}>Share</Text>
        </Pressable>
      </View>

      <Animated.ScrollView
        style={{ opacity: fadeAnim }}
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ transform: [{ translateY: slideAnim }] }}>

          {/* Title + cosmic message */}
          <View style={s.titleSection}>
            <Text style={s.glyphTop}>✦</Text>
            <Text style={s.title}>{reading.title}</Text>
            <View style={s.cosmicMsgWrap}>
              <LinearGradient
                colors={['rgba(123,94,167,0.2)', 'rgba(196,168,255,0.05)']}
                style={s.cosmicMsgGradient}
              >
                <Text style={s.cosmicMsg}>"{reading.cosmicMessage}"</Text>
              </LinearGradient>
            </View>
          </View>

          {/* Overall meaning */}
          <Card label="✦  OVERALL MEANING">
            <Text style={s.bodyText}>{reading.overallMeaning}</Text>
          </Card>

          {/* Emotional tone */}
          <Card label="◉  EMOTIONAL TONE">
            <View style={s.toneRow}>
              <View style={[s.tonePill, { borderColor: intensityColor }]}>
                <Text style={[s.tonePillText, { color: intensityColor }]}>{reading.emotionalTone.primary}</Text>
              </View>
              <Text style={s.toneSep}>·</Text>
              <Text style={s.toneSecondary}>{reading.emotionalTone.secondary}</Text>
              <View style={[s.intensityBadge, { backgroundColor: intensityColor + '22', borderColor: intensityColor + '66' }]}>
                <Text style={[s.intensityText, { color: intensityColor }]}>{reading.emotionalTone.intensity}</Text>
              </View>
            </View>
          </Card>

          {/* Symbols */}
          <Card label="⟁  DREAM SYMBOLS">
            {reading.symbols?.map((sym, i) => (
              <View key={i} style={[s.symbolRow, i < reading!.symbols.length - 1 && s.symbolDivider]}>
                <Text style={s.symbolEmoji}>{sym.emoji}</Text>
                <View style={s.symbolInfo}>
                  <Text style={s.symbolName}>{sym.symbol}</Text>
                  <Text style={s.symbolMeaning}>{sym.meaning}</Text>
                </View>
              </View>
            ))}
          </Card>

          {/* Archetype */}
          <Card label="◈  JUNGIAN ARCHETYPE">
            <Text style={s.archetypeName}>{reading.archetype?.name}</Text>
            <Text style={s.bodyText}>{reading.archetype?.description}</Text>
          </Card>

          {/* Shadow element */}
          <Card label="👤  SHADOW ELEMENT">
            <Text style={s.bodyText}>{reading.shadowElement}</Text>
          </Card>

          {/* Cosmic timing */}
          <Card label="🌙  COSMIC TIMING">
            <Text style={s.bodyText}>{reading.cosmicTiming}</Text>
          </Card>

          {/* Affirmation */}
          <View style={s.affirmationWrap}>
            <LinearGradient
              colors={[Colors.primary + '44', Colors.primaryDark + '22']}
              style={s.affirmationGradient}
            >
              <Text style={s.affirmationGlyph}>✦</Text>
              <Text style={s.affirmationText}>{reading.affirmation}</Text>
            </LinearGradient>
          </View>

          {/* Tags */}
          {reading.tags?.length > 0 && (
            <View style={s.tagsWrap}>
              {reading.tags.map((tag, i) => (
                <View key={i} style={s.tag}>
                  <Text style={s.tagText}>#{tag}</Text>
                </View>
              ))}
            </View>
          )}

          {/* New reading CTA */}
          <Pressable
            onPress={() => router.replace('/input')}
            style={({ pressed }) => [s.newBtn, pressed && { opacity: 0.8 }]}
          >
            <Text style={s.newBtnText}>Interpret Another Dream</Text>
          </Pressable>

          <View style={{ height: 60 }} />
        </Animated.View>
      </Animated.ScrollView>
    </View>
  );
}

function Card({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={c.card}>
      <Text style={c.cardLabel}>{label}</Text>
      {children}
    </View>
  );
}

const c = StyleSheet.create({
  card:      { backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, padding: Spacing.lg, marginBottom: Spacing.md, gap: Spacing.sm },
  cardLabel: { fontSize: 10, letterSpacing: 3, color: Colors.accent, fontWeight: Fonts.weights.semibold, marginBottom: Spacing.xs },
});

const s = StyleSheet.create({
  root:       { flex: 1, backgroundColor: Colors.background },
  scroll:     { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl },

  header:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingTop: 60, paddingBottom: Spacing.lg },
  backText:   { fontSize: 20, color: Colors.textSubtle },
  headerLabel:{ fontSize: 10, letterSpacing: 3, color: Colors.accent, fontWeight: Fonts.weights.semibold },
  shareText:  { fontSize: Fonts.sizes.md, color: Colors.accent },

  titleSection:   { alignItems: 'center', paddingVertical: Spacing.xl, gap: Spacing.md },
  glyphTop:       { fontSize: 28, color: Colors.accent },
  title:          { fontSize: 28, fontWeight: Fonts.weights.heavy, color: Colors.textPrimary, textAlign: 'center', lineHeight: 34 },
  cosmicMsgWrap:  { width: '100%' },
  cosmicMsgGradient: { borderRadius: Radius.lg, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border },
  cosmicMsg:      { fontSize: Fonts.sizes.lg, color: Colors.textSecondary, fontStyle: 'italic', textAlign: 'center', lineHeight: 26 },

  bodyText:       { fontSize: Fonts.sizes.md, color: Colors.textSecondary, lineHeight: 24 },

  toneRow:        { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexWrap: 'wrap' },
  tonePill:       { paddingVertical: 4, paddingHorizontal: Spacing.md, borderRadius: Radius.full, borderWidth: 1 },
  tonePillText:   { fontSize: Fonts.sizes.sm, fontWeight: Fonts.weights.semibold },
  toneSep:        { color: Colors.textSubtle, fontSize: 18 },
  toneSecondary:  { fontSize: Fonts.sizes.md, color: Colors.textSubtle, flex: 1 },
  intensityBadge: { paddingVertical: 2, paddingHorizontal: Spacing.sm, borderRadius: Radius.sm, borderWidth: 1 },
  intensityText:  { fontSize: Fonts.sizes.xs, fontWeight: Fonts.weights.semibold, letterSpacing: 1 },

  symbolRow:      { flexDirection: 'row', gap: Spacing.md, paddingVertical: Spacing.sm },
  symbolDivider:  { borderBottomWidth: 1, borderBottomColor: Colors.border },
  symbolEmoji:    { fontSize: 28, width: 40, textAlign: 'center' },
  symbolInfo:     { flex: 1, gap: 4 },
  symbolName:     { fontSize: Fonts.sizes.md, fontWeight: Fonts.weights.semibold, color: Colors.textPrimary },
  symbolMeaning:  { fontSize: Fonts.sizes.sm, color: Colors.textSecondary, lineHeight: 20 },

  archetypeName:  { fontSize: Fonts.sizes.xl, fontWeight: Fonts.weights.bold, color: Colors.accent, marginBottom: 4 },

  affirmationWrap:    { marginBottom: Spacing.lg },
  affirmationGradient:{ borderRadius: Radius.lg, padding: Spacing.xl, alignItems: 'center', gap: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  affirmationGlyph:   { fontSize: 24, color: Colors.gold },
  affirmationText:    { fontSize: Fonts.sizes.lg, color: Colors.textPrimary, textAlign: 'center', lineHeight: 26, fontStyle: 'italic' },

  tagsWrap:   { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.lg },
  tag:        { paddingVertical: 4, paddingHorizontal: Spacing.md, borderRadius: Radius.full, backgroundColor: Colors.surfaceElevated, borderWidth: 1, borderColor: Colors.border },
  tagText:    { fontSize: Fonts.sizes.xs, color: Colors.textSubtle, letterSpacing: 0.5 },

  newBtn:     { backgroundColor: Colors.surfaceElevated, borderRadius: Radius.xl, paddingVertical: Spacing.md, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  newBtnText: { fontSize: Fonts.sizes.md, color: Colors.accent, fontWeight: Fonts.weights.medium },

  errorText:  { color: Colors.textSubtle, fontSize: Fonts.sizes.lg, marginBottom: Spacing.lg },
  backPill:   { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg, backgroundColor: Colors.surface, borderRadius: Radius.full },
  backPillText:{ color: Colors.accent, fontSize: Fonts.sizes.md },
});

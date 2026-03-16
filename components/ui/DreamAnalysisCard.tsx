import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Fonts, Spacing, Radius } from '@/constants/theme';

export interface DreamAnalysis {
  title: string;
  emotionalTone: {
    primary: string;
    secondary: string;
    intensity: 'Low' | 'Medium' | 'High' | 'Overwhelming';
  };
  keySymbols: Array<{ symbol: string; meaning: string }>;
  narrativeArc: {
    stage: string;
    summary: string;
  };
  jungianArchetypes: Array<{ archetype: string; manifestation: string }>;
  shadowElements: string;
  interpretation: string;
  tags: string[];
  moodId: string;
}

interface DreamAnalysisCardProps {
  analysis: DreamAnalysis;
  fadeAnim?: Animated.Value;
}

const INTENSITY_COLOR: Record<string, string> = {
  Low: Colors.success ?? '#5EBC8F',
  Medium: '#FFD28C',
  High: '#FF9A5C',
  Overwhelming: '#CC4466',
};

const ARC_ICON: Record<string, string> = {
  Descent: 'arrow-downward',
  Wandering: 'explore',
  Confrontation: 'flash-on',
  Revelation: 'lightbulb',
  Ascent: 'arrow-upward',
  Liminal: 'blur-on',
};

export function DreamAnalysisCard({ analysis, fadeAnim }: DreamAnalysisCardProps) {
  const intensityColor = INTENSITY_COLOR[analysis.emotionalTone.intensity] || Colors.accent;
  const arcIcon = (ARC_ICON[analysis.narrativeArc.stage] || 'auto-awesome') as keyof typeof MaterialIcons.glyphMap;

  const content = (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.headerRow}>
        <MaterialIcons name="psychology" size={18} color={Colors.accent} />
        <Text style={styles.headerLabel}>Dream Analysis</Text>
        <View style={[styles.intensityBadge, { backgroundColor: intensityColor + '22', borderColor: intensityColor + '66' }]}>
          <Text style={[styles.intensityText, { color: intensityColor }]}>
            {analysis.emotionalTone.intensity} Intensity
          </Text>
        </View>
      </View>

      {/* Emotional Tone */}
      <View style={styles.toneBlock}>
        <View style={styles.toneRow}>
          <View style={[styles.tonePill, { backgroundColor: Colors.primary + '33', borderColor: Colors.primary + '66' }]}>
            <Text style={styles.tonePrimary}>{analysis.emotionalTone.primary}</Text>
          </View>
          <MaterialIcons name="add" size={14} color={Colors.textSubtle} />
          <View style={[styles.tonePill, { backgroundColor: Colors.surfaceElevated, borderColor: Colors.border }]}>
            <Text style={styles.toneSecondary}>{analysis.emotionalTone.secondary}</Text>
          </View>
        </View>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Narrative Arc */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <MaterialIcons name={arcIcon} size={15} color={Colors.gold} />
          <Text style={styles.sectionTitle}>Narrative Arc · {analysis.narrativeArc.stage}</Text>
        </View>
        <Text style={styles.arcSummary}>{analysis.narrativeArc.summary}</Text>
      </View>

      <View style={styles.divider} />

      {/* Key Symbols */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <MaterialIcons name="visibility" size={15} color={Colors.accent} />
          <Text style={styles.sectionTitle}>Key Symbols</Text>
        </View>
        <View style={styles.symbolsGrid}>
          {analysis.keySymbols.map((s, i) => (
            <View key={i} style={styles.symbolItem}>
              <View style={styles.symbolDot} />
              <View style={styles.symbolText}>
                <Text style={styles.symbolName}>{s.symbol}</Text>
                <Text style={styles.symbolMeaning}>{s.meaning}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.divider} />

      {/* Jungian Archetypes */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <MaterialIcons name="account-circle" size={15} color="#9B7EC7" />
          <Text style={styles.sectionTitle}>Jungian Archetypes</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.archetypeRow}>
            {analysis.jungianArchetypes.map((a, i) => (
              <View key={i} style={styles.archetypeChip}>
                <Text style={styles.archetypeName}>{a.archetype}</Text>
                <Text style={styles.archetypeManif}>{a.manifestation}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      <View style={styles.divider} />

      {/* Shadow Elements */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <MaterialIcons name="dark-mode" size={15} color="#A0A0B0" />
          <Text style={styles.sectionTitle}>Shadow Element</Text>
        </View>
        <Text style={styles.shadowText}>{analysis.shadowElements}</Text>
      </View>

      <View style={styles.divider} />

      {/* Interpretation */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <MaterialIcons name="auto-awesome" size={15} color={Colors.gold} />
          <Text style={styles.sectionTitle}>Interpretation</Text>
        </View>
        <Text style={styles.interpretationText}>{analysis.interpretation}</Text>
      </View>

      {/* Tags */}
      <View style={styles.tagsRow}>
        {analysis.tags.map((tag, i) => (
          <View key={i} style={styles.tag}>
            <Text style={styles.tagText}>#{tag}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  if (fadeAnim) {
    return (
      <Animated.View style={{ opacity: fadeAnim }}>
        {content}
      </Animated.View>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.borderBright,
    padding: Spacing.lg,
    gap: Spacing.md,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  headerLabel: {
    flex: 1,
    color: Colors.accent,
    fontSize: Fonts.sizes.sm,
    fontWeight: Fonts.weights.bold,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  intensityBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  intensityText: {
    fontSize: Fonts.sizes.xs,
    fontWeight: Fonts.weights.semibold,
    letterSpacing: 0.5,
  },
  toneBlock: {
    alignItems: 'flex-start',
  },
  toneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  tonePill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 1,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  tonePrimary: {
    color: Colors.accent,
    fontSize: Fonts.sizes.md,
    fontWeight: Fonts.weights.semibold,
  },
  toneSecondary: {
    color: Colors.textSecondary,
    fontSize: Fonts.sizes.md,
    fontWeight: Fonts.weights.medium,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  section: {
    gap: Spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  sectionTitle: {
    color: Colors.textSecondary,
    fontSize: Fonts.sizes.xs,
    fontWeight: Fonts.weights.bold,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  arcSummary: {
    color: Colors.textPrimary,
    fontSize: Fonts.sizes.md,
    lineHeight: Fonts.sizes.md * 1.65,
    fontStyle: 'italic',
  },
  symbolsGrid: {
    gap: Spacing.sm,
  },
  symbolItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  symbolDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.accent,
    marginTop: 7,
    flexShrink: 0,
  },
  symbolText: {
    flex: 1,
    gap: 2,
  },
  symbolName: {
    color: Colors.textPrimary,
    fontSize: Fonts.sizes.md,
    fontWeight: Fonts.weights.semibold,
    textTransform: 'capitalize',
  },
  symbolMeaning: {
    color: Colors.textSecondary,
    fontSize: Fonts.sizes.sm,
    lineHeight: Fonts.sizes.sm * 1.6,
  },
  archetypeRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  archetypeChip: {
    backgroundColor: 'rgba(155, 126, 199, 0.15)',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: 'rgba(155, 126, 199, 0.35)',
    padding: Spacing.md,
    maxWidth: 180,
    gap: 4,
  },
  archetypeName: {
    color: '#C4A8FF',
    fontSize: Fonts.sizes.md,
    fontWeight: Fonts.weights.bold,
  },
  archetypeManif: {
    color: Colors.textSecondary,
    fontSize: Fonts.sizes.sm,
    lineHeight: Fonts.sizes.sm * 1.55,
  },
  shadowText: {
    color: Colors.textSecondary,
    fontSize: Fonts.sizes.md,
    lineHeight: Fonts.sizes.md * 1.65,
  },
  interpretationText: {
    color: Colors.textPrimary,
    fontSize: Fonts.sizes.md,
    lineHeight: Fonts.sizes.md * 1.75,
    fontStyle: 'italic',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    paddingTop: Spacing.xs,
  },
  tag: {
    backgroundColor: Colors.surfaceGlassLight,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tagText: {
    color: Colors.textSubtle,
    fontSize: Fonts.sizes.xs,
    fontWeight: Fonts.weights.medium,
  },
});

import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SYMBOL_LIBRARY, SYMBOL_CATEGORIES } from '@/constants/symbols';
import { Colors, Fonts, Spacing, Radius } from '@/constants/theme';

export default function SymbolDetailScreen() {
  const { symbolId } = useLocalSearchParams<{ symbolId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  const symbol = SYMBOL_LIBRARY.find((s) => s.id === symbolId);
  const category = SYMBOL_CATEGORIES.find((c) => c.id === symbol?.category);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  if (!symbol || !category) {
    return (
      <View style={styles.notFound}>
        <Text style={styles.notFoundText}>Symbol not found</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backLink}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingBottom: insets.bottom }]}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <MaterialIcons name="arrow-back-ios" size={20} color={Colors.textSecondary} />
        </Pressable>
        <Text style={styles.headerLabel}>Symbol</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Hero */}
        <Animated.View style={[styles.hero, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={[styles.emojiCircle, { backgroundColor: category.bgColor, borderColor: category.color + '50' }]}>
            <Text style={styles.heroEmoji}>{symbol.emoji}</Text>
          </View>
          <Text style={styles.symbolName}>{symbol.symbol}</Text>
          <View style={[styles.categoryBadge, { backgroundColor: category.bgColor, borderColor: category.color + '40' }]}>
            <Text style={styles.categoryEmoji}>{category.emoji}</Text>
            <Text style={[styles.categoryLabel, { color: category.color }]}>{category.label}</Text>
          </View>
          <Text style={styles.shortMeaning}>"{symbol.shortMeaning}"</Text>
        </Animated.View>

        {/* Core Meaning */}
        <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="auto-awesome" size={16} color={Colors.accent} />
            <Text style={styles.cardTitle}>Core Meaning</Text>
          </View>
          <Text style={styles.cardBody}>{symbol.fullMeaning}</Text>
        </Animated.View>

        {/* Jungian Context */}
        <Animated.View style={[styles.card, styles.cardJungian, { opacity: fadeAnim }]}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="psychology" size={16} color="#9B7EC7" />
            <Text style={[styles.cardTitle, { color: '#C4A8FF' }]}>Jungian Context</Text>
          </View>
          <Text style={styles.cardBody}>{symbol.jungianContext}</Text>
        </Animated.View>

        {/* Common Dream Contexts */}
        <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="nightlight-round" size={16} color={Colors.gold} />
            <Text style={styles.cardTitle}>Common Dream Appearances</Text>
          </View>
          <View style={styles.contextList}>
            {symbol.commonDreamContexts.map((ctx, i) => (
              <View key={i} style={styles.contextItem}>
                <View style={[styles.contextDot, { backgroundColor: category.color }]} />
                <Text style={styles.contextText}>{ctx}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* Related Symbols */}
        <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="hub" size={16} color={Colors.info} />
            <Text style={styles.cardTitle}>Related Symbols</Text>
          </View>
          <View style={styles.tagsWrap}>
            {symbol.relatedSymbols.map((tag, i) => {
              const related = SYMBOL_LIBRARY.find(
                (s) => s.symbol.toLowerCase() === tag.toLowerCase() || s.id === tag.toLowerCase()
              );
              return (
                <Pressable
                  key={i}
                  onPress={() => related && router.push({ pathname: '/symbol-detail', params: { symbolId: related.id } })}
                  style={({ pressed }) => [
                    styles.relatedTag,
                    related && styles.relatedTagLinked,
                    pressed && styles.pressed,
                  ]}
                >
                  {related ? <Text style={styles.relatedTagEmoji}>{related.emoji}</Text> : null}
                  <Text style={[styles.relatedTagText, related && { color: Colors.accent }]}>
                    {tag}
                  </Text>
                  {related ? (
                    <MaterialIcons name="arrow-forward-ios" size={10} color={Colors.accent} />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </Animated.View>

        {/* Affirmation */}
        <Animated.View style={[styles.affirmationCard, { opacity: fadeAnim }]}>
          <MaterialIcons name="format-quote" size={24} color={Colors.gold} style={{ opacity: 0.6 }} />
          <Text style={styles.affirmationText}>{symbol.affirmation}</Text>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  notFound: {
    flex: 1, backgroundColor: Colors.background,
    alignItems: 'center', justifyContent: 'center', gap: Spacing.md,
  },
  notFoundText: { color: Colors.textSecondary, fontSize: Fonts.sizes.lg },
  backLink: { color: Colors.accent, fontSize: Fonts.sizes.md, textDecorationLine: 'underline' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm,
  },
  backBtn: { padding: Spacing.xs },
  headerLabel: { color: Colors.textSubtle, fontSize: Fonts.sizes.sm, fontWeight: Fonts.weights.medium, textTransform: 'uppercase', letterSpacing: 1.5 },
  scroll: { paddingHorizontal: Spacing.lg, paddingBottom: 48, gap: Spacing.lg },
  hero: { alignItems: 'center', paddingTop: Spacing.lg, paddingBottom: Spacing.md, gap: Spacing.md },
  emojiCircle: {
    width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5,
    shadowColor: '#C4A8FF', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10,
  },
  heroEmoji: { fontSize: 48 },
  symbolName: { color: Colors.textPrimary, fontSize: Fonts.sizes.xxxl, fontWeight: Fonts.weights.heavy },
  categoryBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.full, borderWidth: 1,
  },
  categoryEmoji: { fontSize: 13 },
  categoryLabel: { fontSize: Fonts.sizes.sm, fontWeight: Fonts.weights.semibold },
  shortMeaning: {
    color: Colors.textSubtle, fontSize: Fonts.sizes.md, fontStyle: 'italic',
    textAlign: 'center', paddingHorizontal: Spacing.lg, lineHeight: Fonts.sizes.md * 1.6,
  },
  card: {
    backgroundColor: Colors.surfaceElevated, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.border, padding: Spacing.lg, gap: Spacing.md,
  },
  cardJungian: {
    borderColor: 'rgba(155,126,199,0.3)', backgroundColor: 'rgba(155,126,199,0.08)',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  cardTitle: {
    color: Colors.textSecondary, fontSize: Fonts.sizes.xs,
    fontWeight: Fonts.weights.bold, textTransform: 'uppercase', letterSpacing: 1.3,
  },
  cardBody: {
    color: Colors.textPrimary, fontSize: Fonts.sizes.md, lineHeight: Fonts.sizes.md * 1.75,
  },
  contextList: { gap: Spacing.sm },
  contextItem: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  contextDot: { width: 6, height: 6, borderRadius: 3, marginTop: 7, flexShrink: 0 },
  contextText: { flex: 1, color: Colors.textSecondary, fontSize: Fonts.sizes.sm, lineHeight: Fonts.sizes.sm * 1.65 },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  relatedTag: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: Spacing.sm + 2, paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.full, backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border,
  },
  relatedTagLinked: { borderColor: Colors.accentDim, backgroundColor: 'rgba(196,168,255,0.08)' },
  relatedTagEmoji: { fontSize: 12 },
  relatedTagText: { color: Colors.textSubtle, fontSize: Fonts.sizes.sm, fontWeight: Fonts.weights.medium },
  pressed: { opacity: 0.75, transform: [{ scale: 0.97 }] },
  affirmationCard: {
    backgroundColor: 'rgba(255,210,140,0.08)', borderRadius: Radius.lg,
    borderWidth: 1, borderColor: 'rgba(255,210,140,0.25)',
    padding: Spacing.lg, gap: Spacing.sm, alignItems: 'center',
  },
  affirmationText: {
    color: Colors.gold, fontSize: Fonts.sizes.lg, fontStyle: 'italic',
    textAlign: 'center', lineHeight: Fonts.sizes.lg * 1.7,
  },
});

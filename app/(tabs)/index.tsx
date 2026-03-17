import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  ScrollView,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DreamPortalButton } from '@/components/ui/DreamPortalButton';
import { useDreams } from '@/hooks/useDreams';
import { Colors, Fonts, Spacing, Radius } from '@/constants/theme';
import { DREAM_STYLES, DREAM_MOODS } from '@/constants/config';
import { calculateStreak } from '@/services/dreamService';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { dreams } = useDreams();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const hour = new Date().getHours();
  const greeting =
    hour < 5 ? 'Still dreaming?' :
    hour < 12 ? 'Good morning, Dreamer' :
    hour < 17 ? 'Good afternoon, Dreamer' :
    hour < 21 ? 'Good evening, Dreamer' :
    'Good night, Dreamer';

  const QUOTES = [
    { text: '"Dreams are the touchstones of our character."', author: '— Henry David Thoreau' },
    { text: '"Sleep is the best meditation."', author: '— Dalai Lama' },
    { text: '"In dreams, we enter a world that is entirely our own."', author: '— J.K. Rowling' },
    { text: '"The dream is the small hidden door in the deepest and most intimate sanctum of the soul."', author: '— Carl Jung' },
    { text: '"All that we see or seem is but a dream within a dream."', author: '— Edgar Allan Poe' },
  ];
  const quote = QUOTES[new Date().getDate() % QUOTES.length];

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        delay: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        delay: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const recentDream = dreams[0];
  const totalDreams = dreams.length;
  const favoritesCount = dreams.filter((d) => d.isFavorite).length;
  const streak = calculateStreak(dreams);

  const styleBreakdown = DREAM_STYLES.map((s) => ({
    ...s,
    count: dreams.filter((d) => d.styleId === s.id).length,
  })).filter((s) => s.count > 0);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar style="light" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* Header */}
        <Animated.View
          style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
        >
          <View>
            <Text style={styles.greeting}>{greeting}</Text>
            <Text style={styles.date}>
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
          </View>
          <Pressable
            onPress={() => router.push('/encyclopedia')}
            style={({ pressed }) => [styles.encyclopediaBtn, pressed && { opacity: 0.75 }]}
          >
            <Text style={styles.encyclopediaBtnEmoji}>📖</Text>
          </Pressable>
        </Animated.View>

        {/* Portal */}
        <Animated.View
          style={[styles.portalSection, { opacity: fadeAnim }]}
        >
          <DreamPortalButton onPress={() => router.push('/dream-input')} />
          <Text style={styles.portalHint}>Tap to capture your dream</Text>
        </Animated.View>

        {/* Stats */}
        <Animated.View
          style={[styles.statsRow, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
        >
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{totalDreams}</Text>
            <Text style={styles.statLabel}>Dreams</Text>
          </View>
          <View style={[styles.statCard, styles.statCardCenter]}>
            <Text style={[styles.statNum, { color: Colors.gold }]}>{favoritesCount}</Text>
            <Text style={styles.statLabel}>Favorites</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNum, { color: Colors.success }]}>{streak}</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </View>
        </Animated.View>

        {/* Style breakdown */}
        {styleBreakdown.length > 0 ? (
          <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
            <Text style={styles.sectionTitle}>Dream Aesthetics</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.styleRow}>
                {styleBreakdown.map((s) => (
                  <View key={s.id} style={[styles.styleChip, { backgroundColor: s.bgColor, borderColor: s.color + '40' }]}>
                    <Text style={styles.styleEmoji}>{s.emoji}</Text>
                    <Text style={[styles.styleChipLabel, { color: s.color }]}>{s.label}</Text>
                    <Text style={[styles.styleChipCount, { color: s.color }]}>{s.count}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          </Animated.View>
        ) : null}

        {/* Last dream preview */}
        {recentDream ? (
          <Animated.View style={[styles.section, { opacity: fadeAnim }]}>
            <Text style={styles.sectionTitle}>Last Dreamscape</Text>
            <View style={styles.recentCard}>
              <View style={styles.recentDot}>
                <Text style={styles.recentDotEmoji}>
                  {DREAM_STYLES.find((s) => s.id === recentDream.styleId)?.emoji || '✦'}
                </Text>
              </View>
              <View style={styles.recentInfo}>
                <Text style={styles.recentTitle}>{recentDream.title}</Text>
                <Text style={styles.recentDesc} numberOfLines={2}>
                  {recentDream.description}
                </Text>
                <Text style={styles.recentDate}>
                  {new Date(recentDream.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </Text>
              </View>
            </View>
          </Animated.View>
        ) : null}

        {/* Quote */}
        <Animated.View style={[styles.quoteBlock, { opacity: fadeAnim }]}>
          <Text style={styles.quoteText}>{quote.text}</Text>
          <Text style={styles.quoteAuthor}>{quote.author}</Text>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  encyclopediaBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  encyclopediaBtnEmoji: {
    fontSize: 18,
  },
  greeting: {
    color: Colors.textPrimary,
    fontSize: Fonts.sizes.xxl,
    fontWeight: Fonts.weights.bold,
  },
  date: {
    color: Colors.textSubtle,
    fontSize: Fonts.sizes.sm,
    letterSpacing: 0.5,
  },
  portalSection: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  portalHint: {
    marginTop: Spacing.xl,
    color: Colors.textSubtle,
    fontSize: Fonts.sizes.sm,
    letterSpacing: 1,
  },
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    gap: 4,
  },
  statCardCenter: {
    borderColor: Colors.goldDim,
  },
  statNum: {
    color: Colors.accent,
    fontSize: Fonts.sizes.xxl,
    fontWeight: Fonts.weights.bold,
  },
  statLabel: {
    color: Colors.textSubtle,
    fontSize: Fonts.sizes.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  section: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  sectionTitle: {
    color: Colors.textSecondary,
    fontSize: Fonts.sizes.sm,
    fontWeight: Fonts.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  styleRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  styleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.full,
    borderWidth: 1,
    gap: 4,
  },
  styleEmoji: {
    fontSize: 14,
  },
  styleChipLabel: {
    fontSize: Fonts.sizes.sm,
    fontWeight: Fonts.weights.medium,
  },
  styleChipCount: {
    fontSize: Fonts.sizes.xs,
    fontWeight: Fonts.weights.bold,
  },
  recentCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.md,
    alignItems: 'flex-start',
  },
  recentDot: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surfaceGlassLight,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentDotEmoji: {
    fontSize: 22,
  },
  recentInfo: {
    flex: 1,
    gap: 4,
  },
  recentTitle: {
    color: Colors.textPrimary,
    fontSize: Fonts.sizes.md,
    fontWeight: Fonts.weights.semibold,
  },
  recentDesc: {
    color: Colors.textSecondary,
    fontSize: Fonts.sizes.sm,
    lineHeight: 18,
  },
  recentDate: {
    color: Colors.textSubtle,
    fontSize: Fonts.sizes.xs,
  },
  quoteBlock: {
    marginHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: Spacing.xs,
  },
  quoteText: {
    color: Colors.textSubtle,
    fontSize: Fonts.sizes.md,
    fontStyle: 'italic',
    lineHeight: Fonts.sizes.md * 1.7,
  },
  quoteAuthor: {
    color: Colors.textSubtle,
    fontSize: Fonts.sizes.sm,
    fontWeight: Fonts.weights.medium,
  },
});

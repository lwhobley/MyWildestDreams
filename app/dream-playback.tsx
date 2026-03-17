import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Animated,
  Share,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDreams } from '@/hooks/useDreams';
import { DREAM_STYLES, DREAM_MOODS } from '@/constants/config';
import { TagBadge } from '@/components/ui/TagBadge';
import { Colors, Fonts, Spacing, Radius } from '@/constants/theme';
import { useAlert } from '@/template';
import { getThumbnailSource } from '@/utils/thumbnail';

export default function DreamPlaybackScreen() {
  const { dreamId } = useLocalSearchParams<{ dreamId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { dreams, toggleDreamFavorite, removeDream } = useDreams();
  const { showAlert } = useAlert();

  const [showInterpretation, setShowInterpretation] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const playProgress = useRef(new Animated.Value(0)).current;
  const playAnim = useRef<Animated.CompositeAnimation | null>(null);

  const dream = dreams.find((d) => d.id === dreamId);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  function handlePlayPause() {
    if (isPlaying) {
      playAnim.current?.stop();
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      playAnim.current = Animated.timing(playProgress, {
        toValue: 1,
        duration: 60000,
        useNativeDriver: false,
      });
      playAnim.current.start(({ finished }) => {
        if (finished) {
          setIsPlaying(false);
          playProgress.setValue(0);
        }
      });
    }
  }

  async function handleShare() {
    if (!dream) return;
    await Share.share({
      message: `My dream: "${dream.title}" — captured with My Wildest Dreams`,
      title: dream.title,
    });
  }

  function handleDelete() {
    showAlert(
      'Delete Dreamscape',
      'This dream will be permanently erased from your archive.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (dream) await removeDream(dream.id);
            router.replace('/(tabs)/library');
          },
        },
      ]
    );
  }

  if (!dream) {
    return (
      <View style={styles.notFound}>
        <Text style={styles.notFoundText}>Dream not found</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backLink}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const style = DREAM_STYLES.find((s) => s.id === dream.styleId);
  const mood = DREAM_MOODS.find((m) => m.id === dream.moodId);
  const progressWidth = playProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={[styles.root, { paddingBottom: insets.bottom }]}>
      <StatusBar style="light" />

      {/* Hero Image */}
      <Animated.View style={[styles.heroWrap, { opacity: fadeAnim }]}>
        <Image
          source={getThumbnailSource(dream)}
          style={styles.hero}
          contentFit="cover"
          transition={400}
        />
        <View style={styles.heroOverlay} />

        {/* Top controls */}
        <View style={[styles.topControls, { paddingTop: insets.top + 8 }]}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={styles.iconBtn}
          >
            <MaterialIcons name="keyboard-arrow-down" size={28} color={Colors.textPrimary} />
          </Pressable>
          <View style={styles.topRight}>
            <Pressable onPress={handleShare} hitSlop={12} style={styles.iconBtn}>
              <MaterialIcons name="ios-share" size={22} color={Colors.textPrimary} />
            </Pressable>
            <Pressable onPress={handleDelete} hitSlop={12} style={styles.iconBtn}>
              <MaterialIcons name="delete-outline" size={22} color={Colors.error} />
            </Pressable>
          </View>
        </View>

        {/* Title on image */}
        <View style={styles.heroCaptionArea}>
          {style ? (
            <View style={[styles.stylePill, { backgroundColor: style.bgColor }]}>
              <Text style={[styles.stylePillText, { color: style.color }]}>
                {style.emoji} {style.label}
              </Text>
            </View>
          ) : null}
          <Text style={styles.heroTitle}>{dream.title}</Text>
          {mood ? (
            <Text style={styles.heroMood}>{mood.icon} {mood.label}</Text>
          ) : null}
        </View>
      </Animated.View>

      {/* Player controls */}
      <View style={styles.playerSection}>
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
        </View>
        <View style={styles.playerRow}>
          <Text style={styles.durationText}>0:00</Text>
          <Pressable
            onPress={handlePlayPause}
            style={({ pressed }) => [styles.playBtn, pressed && styles.pressed]}
          >
            <MaterialIcons
              name={isPlaying ? 'pause' : 'play-arrow'}
              size={32}
              color={Colors.textPrimary}
            />
          </Pressable>
          <Text style={styles.durationText}>{dream.duration}</Text>
        </View>
      </View>

      {/* Scrollable detail */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dream Description</Text>
          <Text style={styles.description}>{dream.description}</Text>
        </View>

        {/* Tags */}
        {dream.tags.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Symbols & Themes</Text>
            <View style={styles.tagsWrap}>
              {dream.tags.map((tag) => {
                return (
                  <Pressable
                    key={tag}
                    onPress={() => router.push('/encyclopedia')}
                    style={({ pressed }) => [pressed && { opacity: 0.75 }]}
                  >
                    <TagBadge label={tag} color={style?.color} bgColor={style?.bgColor} />
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.tagsHint}>Tap a tag to explore its meaning →</Text>
          </View>
        ) : null}

        {/* Interpretation */}
        <View style={styles.section}>
          <Pressable
            onPress={() => setShowInterpretation(!showInterpretation)}
            style={({ pressed }) => [styles.interpretBtn, pressed && styles.pressed]}
          >
            <MaterialIcons name="auto-awesome" size={18} color={Colors.gold} />
            <Text style={styles.interpretBtnText}>
              {showInterpretation ? 'Hide' : 'Interpret Symbolism'}
            </Text>
            <MaterialIcons
              name={showInterpretation ? 'expand-less' : 'expand-more'}
              size={20}
              color={Colors.gold}
            />
          </Pressable>

          {showInterpretation ? (
            <Animated.View style={[styles.interpretBox, { opacity: fadeAnim }]}>
              <Text style={styles.interpretText}>{dream.interpretation}</Text>
            </Animated.View>
          ) : null}
        </View>

        {/* Actions */}
        <View style={styles.actionsRow}>
          <Pressable
            onPress={() => toggleDreamFavorite(dream.id)}
            style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}
          >
            <MaterialIcons
              name={dream.isFavorite ? 'favorite' : 'favorite-border'}
              size={22}
              color={dream.isFavorite ? Colors.gold : Colors.textSecondary}
            />
            <Text style={styles.actionBtnText}>
              {dream.isFavorite ? 'Saved' : 'Save'}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.push({ pathname: '/dream-input', params: { dreamId: dream.id } })}
            style={({ pressed }) => [styles.actionBtn, styles.actionBtnPrimary, pressed && styles.pressed]}
          >
            <MaterialIcons name="refresh" size={22} color={Colors.textPrimary} />
            <Text style={[styles.actionBtnText, { color: Colors.textPrimary }]}>Re-Render</Text>
          </Pressable>

          <Pressable
            onPress={handleShare}
            style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}
          >
            <MaterialIcons name="ios-share" size={22} color={Colors.textSecondary} />
            <Text style={styles.actionBtnText}>Share</Text>
          </Pressable>
        </View>

        <Text style={styles.dateText}>
          Dreamed on{' '}
          {new Date(dream.createdAt).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  notFound: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  notFoundText: {
    color: Colors.textSecondary,
    fontSize: Fonts.sizes.lg,
  },
  backLink: {
    color: Colors.accent,
    fontSize: Fonts.sizes.md,
    textDecorationLine: 'underline',
  },
  heroWrap: {
    height: 320,
    position: 'relative',
  },
  hero: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 11, 26, 0.4)',
  },
  topControls: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
  },
  topRight: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(10, 11, 26, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCaptionArea: {
    position: 'absolute',
    bottom: Spacing.lg,
    left: Spacing.lg,
    right: Spacing.lg,
    gap: Spacing.xs,
  },
  stylePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  stylePillText: {
    fontSize: Fonts.sizes.xs,
    fontWeight: Fonts.weights.semibold,
  },
  heroTitle: {
    color: Colors.textPrimary,
    fontSize: Fonts.sizes.xxl,
    fontWeight: Fonts.weights.bold,
    lineHeight: Fonts.sizes.xxl * 1.2,
  },
  heroMood: {
    color: 'rgba(232, 224, 255, 0.7)',
    fontSize: Fonts.sizes.sm,
  },
  playerSection: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.sm,
  },
  progressTrack: {
    height: 3,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.accent,
    borderRadius: Radius.full,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  durationText: {
    color: Colors.textSubtle,
    fontSize: Fonts.sizes.sm,
    fontVariant: ['tabular-nums'],
    width: 36,
  },
  playBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
  },
  scroll: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: 40,
    gap: Spacing.lg,
  },
  section: {
    gap: Spacing.sm,
  },
  sectionTitle: {
    color: Colors.textSubtle,
    fontSize: Fonts.sizes.xs,
    fontWeight: Fonts.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  description: {
    color: Colors.textPrimary,
    fontSize: Fonts.sizes.md,
    lineHeight: Fonts.sizes.md * 1.75,
  },
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  interpretBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.goldDim,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
  },
  interpretBtnText: {
    flex: 1,
    color: Colors.gold,
    fontSize: Fonts.sizes.md,
    fontWeight: Fonts.weights.medium,
  },
  interpretBox: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.goldDim,
    padding: Spacing.md,
  },
  interpretText: {
    color: Colors.textPrimary,
    fontSize: Fonts.sizes.md,
    lineHeight: Fonts.sizes.md * 1.75,
    fontStyle: 'italic',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 4,
  },
  actionBtnPrimary: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  actionBtnText: {
    color: Colors.textSecondary,
    fontSize: Fonts.sizes.xs,
    fontWeight: Fonts.weights.medium,
  },
  dateText: {
    color: Colors.textSubtle,
    fontSize: Fonts.sizes.xs,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

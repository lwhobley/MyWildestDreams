import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { Dream } from '@/services/dreamService';
import { DREAM_STYLES } from '@/constants/config';
import { Colors, Fonts, Spacing, Radius } from '@/constants/theme';
import { TagBadge } from './TagBadge';
import { getThumbnailSource } from '@/utils/thumbnail';

interface DreamCardProps {
  dream: Dream;
  onPress: () => void;
  onFavorite: () => void;
  variant?: 'grid' | 'list';
}

export function DreamCard({ dream, onPress, onFavorite, variant = 'grid' }: DreamCardProps) {
  const style = DREAM_STYLES.find((s) => s.id === dream.styleId);

  if (variant === 'list') {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.listCard, pressed && styles.pressed]}
      >
        <Image
          source={getThumbnailSource(dream)}
          style={styles.listThumbnail}
          contentFit="cover"
          transition={200}
        />
        <View style={styles.listInfo}>
          <Text style={styles.title} numberOfLines={1}>{dream.title}</Text>
          <Text style={styles.desc} numberOfLines={2}>{dream.description}</Text>
          <View style={styles.metaRow}>
            {style ? (
              <View style={[styles.stylePill, { backgroundColor: style.bgColor }]}>
                <Text style={[styles.styleLabel, { color: style.color }]}>
                  {style.emoji} {style.label}
                </Text>
              </View>
            ) : null}
            <Text style={styles.duration}>{dream.duration}</Text>
          </View>
        </View>
        <Pressable onPress={onFavorite} hitSlop={12} style={styles.favBtn}>
          <MaterialIcons
            name={dream.isFavorite ? 'favorite' : 'favorite-border'}
            size={20}
            color={dream.isFavorite ? Colors.gold : Colors.textSubtle}
          />
        </Pressable>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.gridCard, pressed && styles.pressed]}
    >
      <Image
        source={getThumbnailSource(dream)}
        style={styles.gridThumbnail}
        contentFit="cover"
        transition={200}
      />
      <View style={styles.gridOverlay}>
        <Pressable onPress={onFavorite} hitSlop={12} style={styles.favBtnGrid}>
          <MaterialIcons
            name={dream.isFavorite ? 'favorite' : 'favorite-border'}
            size={16}
            color={dream.isFavorite ? Colors.gold : 'rgba(255,255,255,0.6)'}
          />
        </Pressable>
        {style ? (
          <View style={[styles.stylePillGrid, { backgroundColor: style.bgColor }]}>
            <Text style={[styles.styleLabelGrid, { color: style.color }]}>{style.emoji}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.gridInfo}>
        <Text style={styles.gridTitle} numberOfLines={1}>{dream.title}</Text>
        <Text style={styles.duration}>{dream.duration}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },

  // List
  listCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
  },
  listThumbnail: {
    width: 90,
    height: 80,
  },
  listInfo: {
    flex: 1,
    padding: Spacing.sm,
    gap: 4,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: Fonts.sizes.md,
    fontWeight: Fonts.weights.semibold,
  },
  desc: {
    color: Colors.textSecondary,
    fontSize: Fonts.sizes.sm,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  stylePill: {
    paddingHorizontal: Spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  styleLabel: {
    fontSize: Fonts.sizes.xs,
    fontWeight: Fonts.weights.medium,
  },
  duration: {
    color: Colors.textSubtle,
    fontSize: Fonts.sizes.xs,
  },
  favBtn: {
    padding: Spacing.sm,
    justifyContent: 'center',
  },

  // Grid
  gridCard: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  gridThumbnail: {
    width: '100%',
    aspectRatio: 4 / 3,
  },
  gridOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: Spacing.xs,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  favBtnGrid: {
    padding: 4,
  },
  stylePillGrid: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  styleLabelGrid: {
    fontSize: 12,
  },
  gridInfo: {
    padding: Spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gridTitle: {
    color: Colors.textPrimary,
    fontSize: Fonts.sizes.sm,
    fontWeight: Fonts.weights.semibold,
    flex: 1,
  },
});

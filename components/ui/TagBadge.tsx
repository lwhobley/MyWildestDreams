import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Fonts, Spacing, Radius } from '@/constants/theme';

interface TagBadgeProps {
  label: string;
  color?: string;
  bgColor?: string;
  small?: boolean;
}

export function TagBadge({ label, color, bgColor, small = false }: TagBadgeProps) {
  return (
    <View
      style={[
        styles.badge,
        small && styles.badgeSmall,
        { backgroundColor: bgColor || Colors.surfaceGlassLight },
      ]}
    >
      <Text
        style={[
          styles.label,
          small && styles.labelSmall,
          { color: color || Colors.accent },
        ]}
      >
        #{label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  badgeSmall: {
    paddingHorizontal: Spacing.xs + 2,
    paddingVertical: 2,
  },
  label: {
    fontSize: Fonts.sizes.sm,
    fontWeight: Fonts.weights.medium,
  },
  labelSmall: {
    fontSize: Fonts.sizes.xs,
  },
});

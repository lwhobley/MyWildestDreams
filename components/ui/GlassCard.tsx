import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Radius } from '@/constants/theme';

interface GlassCardProps {
  children: ReactNode;
  style?: ViewStyle;
  glow?: boolean;
  goldGlow?: boolean;
}

export function GlassCard({ children, style, glow = false, goldGlow = false }: GlassCardProps) {
  return (
    <View
      style={[
        styles.card,
        glow && styles.glowBorder,
        goldGlow && styles.goldGlowBorder,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surfaceGlass,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  glowBorder: {
    borderColor: Colors.borderBright,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  goldGlowBorder: {
    borderColor: 'rgba(255, 210, 140, 0.5)',
    shadowColor: Colors.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
});

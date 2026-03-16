import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { Colors } from '@/constants/theme';

interface WaveformVisualizerProps {
  data: number[];       // normalised 0–1 amplitude per bar (real metering or idle)
  isActive: boolean;    // true while recording
  color?: string;
  height?: number;
}

// Minimum bar height as a fraction of total height
const MIN_BAR_FRACTION = 0.04;

export function WaveformVisualizer({
  data,
  isActive,
  color = Colors.accent,
  height = 64,
}: WaveformVisualizerProps) {
  // One Animated.Value per bar, initialised to the minimum
  const animValues = useRef<Animated.Value[]>(
    data.map(() => new Animated.Value(MIN_BAR_FRACTION))
  ).current;

  // Re-run spring animations whenever data changes
  useEffect(() => {
    const animations = data.map((amplitude, i) => {
      const target = Math.max(MIN_BAR_FRACTION, amplitude);
      return Animated.spring(animValues[i], {
        toValue: target,
        // Tighter spring while recording for snappy response;
        // slower decay when idle / stopped for a graceful fade-down
        stiffness: isActive ? 280 : 120,
        damping:   isActive ?  22 :  18,
        mass: 1,
        useNativeDriver: false, // height is not supported by native driver
      });
    });

    // Run all bar animations in parallel
    Animated.parallel(animations, { stopTogether: false }).start();
  }, [data, isActive]);

  const rgb = hexToRgb(color);

  return (
    <View style={[styles.container, { height }]}>
      {animValues.map((animVal, index) => {
        const barHeight = animVal.interpolate({
          inputRange:  [0, 1],
          outputRange: [2, height],
          extrapolate: 'clamp',
        });

        const opacity = animVal.interpolate({
          inputRange:  [MIN_BAR_FRACTION, 0.3, 1],
          outputRange: [0.25, 0.55, 1],
          extrapolate: 'clamp',
        });

        return (
          <Animated.View
            key={index}
            style={[
              styles.bar,
              {
                height: barHeight,
                opacity: isActive ? opacity : 0.2,
                backgroundColor: `rgba(${rgb}, 1)`,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

function hexToRgb(hex: string): string {
  const rgbaMatch = hex.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbaMatch) return `${rgbaMatch[1]}, ${rgbaMatch[2]}, ${rgbaMatch[3]}`;
  const clean = hex.replace('#', '');
  if (clean.length >= 6) {
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    if (!isNaN(r) && !isNaN(g) && !isNaN(b)) return `${r}, ${g}, ${b}`;
  }
  return '196, 168, 255';
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2.5,
  },
  bar: {
    width: 3,
    borderRadius: 2,
  },
});

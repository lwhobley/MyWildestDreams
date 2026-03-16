import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Pressable, Text } from 'react-native';
import { Image } from 'expo-image';
import { Colors, Fonts } from '@/constants/theme';

interface DreamPortalButtonProps {
  onPress: () => void;
}

export function DreamPortalButton({ onPress }: DreamPortalButtonProps) {
  const pulse1 = useRef(new Animated.Value(1)).current;
  const pulse2 = useRef(new Animated.Value(1)).current;
  const pulse3 = useRef(new Animated.Value(1)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createPulse = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1.6,
            duration: 1800,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ])
      );

    const rotateLoop = Animated.loop(
      Animated.timing(rotate, {
        toValue: 1,
        duration: 20000,
        useNativeDriver: true,
      })
    );

    createPulse(pulse1, 0).start();
    createPulse(pulse2, 600).start();
    createPulse(pulse3, 1200).start();
    rotateLoop.start();
  }, []);

  const spin = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
    >
      {/* Pulse rings */}
      <Animated.View style={[styles.ring, styles.ring1, { transform: [{ scale: pulse1 }] }]} />
      <Animated.View style={[styles.ring, styles.ring2, { transform: [{ scale: pulse2 }] }]} />
      <Animated.View style={[styles.ring, styles.ring3, { transform: [{ scale: pulse3 }] }]} />

      {/* Rotating portal image */}
      <View style={styles.portalWrap}>
        <Animated.View style={{ transform: [{ rotate: spin }], width: 160, height: 160 }}>
          <Image
            source={require('@/assets/images/dream_portal.png')}
            style={styles.portalImage}
            contentFit="contain"
            transition={300}
          />
        </Animated.View>
      </View>

      <Text style={styles.label}>Enter Dream</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.97 }],
  },
  ring: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 1,
  },
  ring1: {
    width: 200,
    height: 200,
    borderColor: 'rgba(196, 168, 255, 0.25)',
  },
  ring2: {
    width: 240,
    height: 240,
    borderColor: 'rgba(196, 168, 255, 0.15)',
  },
  ring3: {
    width: 280,
    height: 280,
    borderColor: 'rgba(123, 94, 167, 0.1)',
  },
  portalWrap: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 30,
    elevation: 20,
  },
  portalImage: {
    width: 160,
    height: 160,
  },
  label: {
    marginTop: 24,
    color: Colors.textSecondary,
    fontSize: Fonts.sizes.sm,
    fontWeight: Fonts.weights.medium,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
});

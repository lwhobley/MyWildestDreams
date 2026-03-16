import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  ScrollView,
  Animated,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { setOnboardingComplete } from '@/services/dreamService';
import { Colors, Fonts, Spacing, Radius } from '@/constants/theme';

const { width, height } = Dimensions.get('window');

const SLIDES = [
  {
    image: require('@/assets/images/onboarding1.jpg'),
    title: 'Your Dreams,\nCinematic',
    subtitle: 'Capture the visions of your sleeping mind and transform them into immersive visual stories.',
  },
  {
    image: require('@/assets/images/onboarding2.jpg'),
    title: 'Speak or\nType Freely',
    subtitle: 'Describe what you saw, felt, or sensed. Our AI listens, understands, and creates.',
  },
  {
    image: require('@/assets/images/onboarding3.jpg'),
    title: 'Choose Your\nAesthetic',
    subtitle: 'Surreal, Cyberpunk, Watercolor, Noir — render your dreams in the style that resonates with your soul.',
  },
];

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const router = useRouter();

  function handleNext() {
    if (currentIndex < SLIDES.length - 1) {
      scrollRef.current?.scrollTo({ x: (currentIndex + 1) * width, animated: true });
      setCurrentIndex(currentIndex + 1);
    } else {
      handleStart();
    }
  }

  async function handleStart() {
    await setOnboardingComplete();
    router.replace('/(tabs)');
  }

  function handleScroll(e: any) {
    const idx = Math.round(e.nativeEvent.contentOffset.x / width);
    setCurrentIndex(idx);
  }

  const slide = SLIDES[currentIndex];

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        scrollEventThrottle={16}
        style={StyleSheet.absoluteFill}
      >
        {SLIDES.map((s, i) => (
          <Image
            key={i}
            source={s.image}
            style={{ width, height }}
            contentFit="cover"
            transition={400}
          />
        ))}
      </ScrollView>

      {/* Dark overlay */}
      <View style={styles.overlay} />

      {/* Content */}
      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.logoArea}>
          <Text style={styles.logoText}>✦ My Wildest Dreams</Text>
        </View>

        {/* Text */}
        <View style={styles.textArea}>
          <Text style={styles.title}>{slide.title}</Text>
          <Text style={styles.subtitle}>{slide.subtitle}</Text>
        </View>

        {/* Dots */}
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === currentIndex && styles.dotActive]}
            />
          ))}
        </View>

        {/* Buttons */}
        <View style={styles.actions}>
          <Pressable
            onPress={handleNext}
            style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
          >
            <Text style={styles.btnText}>
              {currentIndex < SLIDES.length - 1 ? 'Continue' : 'Begin Dreaming'}
            </Text>
          </Pressable>

          {currentIndex < SLIDES.length - 1 ? (
            <Pressable onPress={handleStart} hitSlop={12}>
              <Text style={styles.skip}>Skip</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 11, 26, 0.6)',
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: 60,
    paddingBottom: 48,
    justifyContent: 'space-between',
  },
  logoArea: {
    alignItems: 'center',
  },
  logoText: {
    color: Colors.accent,
    fontSize: Fonts.sizes.md,
    fontWeight: Fonts.weights.semibold,
    letterSpacing: 1.5,
  },
  textArea: {
    gap: Spacing.md,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: Fonts.sizes.xxxl,
    fontWeight: Fonts.weights.heavy,
    lineHeight: Fonts.sizes.xxxl * 1.25,
  },
  subtitle: {
    color: 'rgba(232, 224, 255, 0.75)',
    fontSize: Fonts.sizes.lg,
    lineHeight: Fonts.sizes.lg * 1.7,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(196, 168, 255, 0.3)',
  },
  dotActive: {
    width: 24,
    backgroundColor: Colors.accent,
  },
  actions: {
    gap: Spacing.md,
    alignItems: 'center',
  },
  btn: {
    width: '100%',
    paddingVertical: Spacing.md,
    borderRadius: Radius.xl,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 12,
  },
  btnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  btnText: {
    color: Colors.textPrimary,
    fontSize: Fonts.sizes.lg,
    fontWeight: Fonts.weights.bold,
    letterSpacing: 0.5,
  },
  skip: {
    color: Colors.textSubtle,
    fontSize: Fonts.sizes.md,
    fontWeight: Fonts.weights.medium,
  },
});

/**
 * Home Screen — Cosmic portal entry point
 */
import { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Pressable,
  Animated, Dimensions, ImageBackground,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Colors, Fonts, Spacing, Radius } from '@/constants/theme';

const { width, height } = Dimensions.get('window');

export default function HomeScreen() {
  const router = useRouter();
  const pulseAnim  = useRef(new Animated.Value(1)).current;
  const fadeAnim   = useRef(new Animated.Value(0)).current;
  const slideAnim  = useRef(new Animated.Value(40)).current;
  const ring1Anim  = useRef(new Animated.Value(0)).current;
  const ring2Anim  = useRef(new Animated.Value(0)).current;
  const ring3Anim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 1000, delay: 200, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 800,  delay: 200, useNativeDriver: true }),
    ]).start();

    // Portal pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 2000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 2000, useNativeDriver: true }),
      ])
    ).start();

    // Expanding rings
    const animateRing = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: 1, duration: 3000, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 0,    useNativeDriver: true }),
        ])
      ).start();

    animateRing(ring1Anim, 0);
    animateRing(ring2Anim, 1000);
    animateRing(ring3Anim, 2000);
  }, []);

  const ringStyle = (anim: Animated.Value, size: number) => ({
    position: 'absolute' as const,
    width:  size,
    height: size,
    borderRadius: size / 2,
    borderWidth: 1,
    borderColor: 'rgba(196,168,255,0.4)',
    opacity: anim.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.6, 0.4, 0] }),
    transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.4] }) }],
  });

  return (
    <View style={s.root}>
      <StatusBar style="light" />

      {/* Background */}
      <ImageBackground
        source={require('@/assets/images/onboarding1.jpg')}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      />
      <LinearGradient
        colors={['rgba(6,7,17,0.3)', 'rgba(10,11,26,0.85)', '#0A0B1A']}
        style={StyleSheet.absoluteFill}
        locations={[0, 0.5, 1]}
      />

      <Animated.View style={[s.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.eyebrow}>COSMIC DREAM ORACLE</Text>
          <Text style={s.title}>My Wildest{'\n'}Dreams</Text>
          <Text style={s.subtitle}>
            Speak your dream into the cosmos.{'\n'}
            Receive its meaning from the stars.
          </Text>
        </View>

        {/* Portal */}
        <View style={s.portalWrap}>
          <Animated.View style={ringStyle(ring1Anim, 260)} />
          <Animated.View style={ringStyle(ring2Anim, 300)} />
          <Animated.View style={ringStyle(ring3Anim, 340)} />

          <Animated.View style={[s.portalOuter, { transform: [{ scale: pulseAnim }] }]}>
            <LinearGradient
              colors={['rgba(123,94,167,0.6)', 'rgba(196,168,255,0.2)', 'rgba(10,11,26,0.9)']}
              style={s.portalGradient}
              start={{ x: 0.3, y: 0 }}
              end={{ x: 0.7, y: 1 }}
            >
              <Text style={s.portalGlyph}>✦</Text>
              <Text style={s.portalLabel}>ENTER</Text>
            </LinearGradient>
          </Animated.View>
        </View>

        {/* CTA */}
        <View style={s.cta}>
          <Pressable
            onPress={() => router.push('/input')}
            style={({ pressed }) => [s.btn, pressed && s.btnPressed]}
          >
            <LinearGradient
              colors={[Colors.primary, Colors.primaryDark]}
              style={s.btnGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={s.btnText}>Interpret My Dream</Text>
            </LinearGradient>
          </Pressable>

          <Text style={s.hint}>Powered by Gemini AI · Cosmic symbolism</Text>
        </View>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  root:         { flex: 1, backgroundColor: Colors.background },
  content:      { flex: 1, paddingHorizontal: Spacing.lg, paddingTop: 80, paddingBottom: 48, justifyContent: 'space-between' },

  header:       { alignItems: 'center', gap: Spacing.md },
  eyebrow:      { fontSize: 10, letterSpacing: 4, color: Colors.accent, fontWeight: Fonts.weights.semibold },
  title:        { fontSize: 48, fontWeight: Fonts.weights.heavy, color: Colors.textPrimary, textAlign: 'center', lineHeight: 52 },
  subtitle:     { fontSize: Fonts.sizes.md, color: Colors.textSubtle, textAlign: 'center', lineHeight: 24, fontStyle: 'italic' },

  portalWrap:   { alignItems: 'center', justifyContent: 'center', height: 260 },
  portalOuter:  { width: 160, height: 160, borderRadius: 80, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(196,168,255,0.5)',
                  shadowColor: Colors.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 30, elevation: 20 },
  portalGradient: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  portalGlyph:  { fontSize: 40, color: Colors.accent },
  portalLabel:  { fontSize: 10, letterSpacing: 3, color: Colors.accent, fontWeight: Fonts.weights.semibold },

  cta:          { gap: Spacing.md, alignItems: 'center' },
  btn:          { width: '100%', borderRadius: Radius.xl, overflow: 'hidden',
                  shadowColor: Colors.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 20, elevation: 12 },
  btnPressed:   { opacity: 0.85, transform: [{ scale: 0.98 }] },
  btnGradient:  { paddingVertical: Spacing.md + 2, alignItems: 'center' },
  btnText:      { fontSize: Fonts.sizes.lg, fontWeight: Fonts.weights.bold, color: Colors.textPrimary, letterSpacing: 0.5 },
  hint:         { fontSize: Fonts.sizes.xs, color: Colors.textSubtle, letterSpacing: 0.5 },
});

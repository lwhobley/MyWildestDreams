import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useAuth } from '@/template';
import { Colors, Fonts, Spacing, Radius } from '@/constants/theme';

export default function LoginScreen() {
  const router = useRouter();
  const { signInWithGoogle, operationLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [appleAvailable, setAppleAvailable] = useState(false);

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(32)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 900, delay: 100, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 700, delay: 100, useNativeDriver: true }),
    ]).start();

    // Apple Sign-In is only available on iOS 13+
    if (Platform.OS === 'ios') {
      AppleAuthentication.isAvailableAsync().then(setAppleAvailable);
    }
  }, []);

  async function handleGoogle() {
    setError(null);
    const result = await signInWithGoogle();
    if (result?.error && result.error !== 'User cancelled login') {
      setError(result.error);
    }
    // On success, AuthRouter in _layout.tsx will redirect automatically
  }

  async function handleApple() {
    setError(null);
    try {
      // signInWithApple is patched onto authService in service.ts
      const { authService } = await import('@/template');
      const result = await (authService as any).signInWithApple();
      if (result?.error && result.error !== 'User cancelled Apple Sign-In') {
        setError(result.error);
      }
    } catch (err: any) {
      setError(err?.message ?? 'Apple Sign-In failed');
    }
  }

  function handleSkip() {
    // Allow guest access — app still works fully with local AsyncStorage
    router.replace('/(tabs)');
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {/* Background image */}
      <Image
        source={require('@/assets/images/onboarding1.jpg')}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        transition={400}
      />
      <View style={styles.overlay} />

      <Animated.View
        style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
      >
        {/* Logo */}
        <View style={styles.logoSection}>
          <Text style={styles.logoMark}>✦</Text>
          <Text style={styles.appName}>My Wildest Dreams</Text>
          <Text style={styles.tagline}>Your dreams, remembered & understood</Text>
        </View>

        {/* Auth buttons */}
        <View style={styles.authSection}>
          {/* Google */}
          <Pressable
            onPress={handleGoogle}
            disabled={operationLoading}
            style={({ pressed }) => [styles.oauthBtn, pressed && styles.pressed]}
          >
            {operationLoading ? (
              <ActivityIndicator size="small" color={Colors.textPrimary} />
            ) : (
              <MaterialIcons name="login" size={20} color={Colors.textPrimary} />
            )}
            <Text style={styles.oauthBtnText}>Continue with Google</Text>
          </Pressable>

          {/* Apple — iOS only */}
          {appleAvailable ? (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
              cornerRadius={Radius.xl}
              style={styles.appleBtn}
              onPress={handleApple}
            />
          ) : null}

          {/* Error */}
          {error ? (
            <View style={styles.errorRow}>
              <MaterialIcons name="error-outline" size={15} color={Colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerLabel}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Guest access */}
          <Pressable
            onPress={handleSkip}
            style={({ pressed }) => [styles.guestBtn, pressed && styles.pressed]}
          >
            <Text style={styles.guestBtnText}>Continue without account</Text>
          </Pressable>

          <Text style={styles.disclaimer}>
            By continuing you agree to our Terms & Privacy Policy.{'\n'}
            Dreams are stored locally on your device.
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 11, 26, 0.72)',
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: 80,
    paddingBottom: 52,
    justifyContent: 'space-between',
  },

  // Logo
  logoSection: { alignItems: 'center', gap: Spacing.sm },
  logoMark: { fontSize: 48, color: Colors.accent },
  appName: {
    color: Colors.textPrimary, fontSize: Fonts.sizes.xxl,
    fontWeight: Fonts.weights.heavy, letterSpacing: 0.5,
  },
  tagline: {
    color: 'rgba(232, 224, 255, 0.65)', fontSize: Fonts.sizes.md,
    fontStyle: 'italic', textAlign: 'center',
  },

  // Auth
  authSection: { gap: Spacing.md },

  oauthBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.sm, backgroundColor: Colors.primary,
    paddingVertical: Spacing.md + 2, borderRadius: Radius.xl,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55, shadowRadius: 18, elevation: 10,
  },
  oauthBtnText: {
    color: Colors.textPrimary, fontSize: Fonts.sizes.lg,
    fontWeight: Fonts.weights.semibold,
  },

  appleBtn: { width: '100%', height: 56 },

  errorRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    backgroundColor: 'rgba(204,68,102,0.12)', borderRadius: Radius.md,
    borderWidth: 1, borderColor: 'rgba(204,68,102,0.3)',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
  },
  errorText: { flex: 1, color: Colors.error, fontSize: Fonts.sizes.sm },

  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerLabel: { color: Colors.textSubtle, fontSize: Fonts.sizes.sm },

  guestBtn: {
    alignItems: 'center', paddingVertical: Spacing.md,
    borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.surfaceElevated,
  },
  guestBtnText: {
    color: Colors.textSecondary, fontSize: Fonts.sizes.md,
    fontWeight: Fonts.weights.medium,
  },

  disclaimer: {
    color: Colors.textSubtle, fontSize: Fonts.sizes.xs,
    textAlign: 'center', lineHeight: Fonts.sizes.xs * 1.8,
  },

  pressed: { opacity: 0.82, transform: [{ scale: 0.98 }] },
});

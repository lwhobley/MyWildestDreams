import React, { Component, ReactNode, ErrorInfo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Colors, Fonts, Spacing, Radius } from '@/constants/theme';

interface Props  { children: ReactNode; }
interface State  { hasError: boolean; error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  reset = () => this.setState({ hasError: false, error: null });

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <View style={s.root}>
        <Text style={s.icon}>🌙</Text>
        <Text style={s.title}>Something drifted off course.</Text>
        <Text style={s.body}>
          An unexpected error occurred. Your dreams are safe.
        </Text>
        {__DEV__ && (
          <Text style={s.debug}>{this.state.error?.message}</Text>
        )}
        <Pressable onPress={this.reset} style={({ pressed }) => [s.btn, pressed && s.pressed]}>
          <Text style={s.btnText}>Try Again</Text>
        </Pressable>
      </View>
    );
  }
}

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  icon:    { fontSize: 52, marginBottom: Spacing.lg },
  title:   { color: Colors.textPrimary, fontSize: Fonts.sizes.xl, fontWeight: Fonts.weights.semibold, textAlign: 'center', marginBottom: Spacing.sm },
  body:    { color: Colors.textSubtle, fontSize: Fonts.sizes.md, textAlign: 'center', lineHeight: Fonts.sizes.md * 1.7, marginBottom: Spacing.xl },
  debug:   { color: Colors.error, fontSize: Fonts.sizes.xs, textAlign: 'center', marginBottom: Spacing.lg, fontFamily: 'monospace' },
  btn:     { paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl, borderRadius: Radius.xl, backgroundColor: Colors.primary },
  btnText: { color: Colors.textPrimary, fontSize: Fonts.sizes.md, fontWeight: Fonts.weights.semibold },
  pressed: { opacity: 0.8 },
});

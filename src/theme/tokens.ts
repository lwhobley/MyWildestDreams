// src/theme/tokens.ts
// ─── MY WILDEST DREAMS · Design System ───────────────────────────────────────

export const Colors = {
  // Backgrounds
  void: '#04030a',
  abyss: '#070612',
  deep: '#0d0b1e',
  dusk: '#141228',

  // Aurora accent palette
  violet: '#7b5ea7',
  teal: '#4ecdc4',
  rose: '#c77dff',
  gold: '#ffd166',
  blue: '#48cae4',
  pink: '#ff6eb4',

  // Text
  silver: 'rgba(200, 200, 220, 0.85)',
  dim: 'rgba(200, 200, 220, 0.38)',
  ghost: 'rgba(200, 200, 220, 0.12)',
  pure: '#f0ecff',

  // Glass surfaces
  glass: 'rgba(255, 255, 255, 0.04)',
  glassHover: 'rgba(255, 255, 255, 0.07)',
  glassBorder: 'rgba(255, 255, 255, 0.07)',

  // Semantic
  error: '#ff6b6b',
  success: '#4ecdc4',
  warning: '#ffd166',
} as const;

export const Typography = {
  display: 'CormorantGaramond-LightItalic',
  displayRegular: 'CormorantGaramond-Light',
  body: 'Jost-ExtraLight',
  bodyLight: 'Jost-Thin',
  label: 'Jost-Light',
  mono: 'SpaceMono-Regular',
} as const;

export const FontSize = {
  xs: 9,
  sm: 11,
  base: 13,
  md: 15,
  lg: 18,
  xl: 22,
  '2xl': 28,
  '3xl': 36,
  '4xl': 48,
  hero: 64,
} as const;

export const Spacing = {
  px: 1,
  0.5: 2,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
} as const;

export const Radius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const Shadow = {
  violet: {
    shadowColor: Colors.violet,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  teal: {
    shadowColor: Colors.teal,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  rose: {
    shadowColor: Colors.rose,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 9,
  },
} as const;

export const VisualStyles = [
  { id: 'surreal',    label: 'Surreal',    emoji: '🌊', color: Colors.blue },
  { id: 'cyberpunk',  label: 'Cyberpunk',  emoji: '🌆', color: Colors.rose },
  { id: 'watercolor', label: 'Watercolor', emoji: '🎨', color: Colors.pink },
  { id: 'noir',       label: 'Noir',       emoji: '🖤', color: Colors.dim },
  { id: 'cosmic',     label: 'Cosmic',     emoji: '🌌', color: Colors.violet },
  { id: 'anime',      label: 'Anime',      emoji: '⛩️', color: Colors.gold },
  { id: 'gothic',     label: 'Gothic',     emoji: '🕯️', color: Colors.rose },
  { id: 'vintage',    label: 'Vintage',    emoji: '📽️', color: Colors.gold },
] as const;

export type VisualStyleId = typeof VisualStyles[number]['id'];

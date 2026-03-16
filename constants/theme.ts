// My Wildest Dreams — Design System
// Physical Metaphor: Glass + Cosmic Depth

export const Colors = {
  // Backgrounds
  background: '#0A0B1A',
  backgroundDeep: '#060711',
  surface: '#12142A',
  surfaceElevated: '#1A1D3A',
  surfaceGlass: 'rgba(18, 20, 42, 0.85)',
  surfaceGlassLight: 'rgba(196, 168, 255, 0.08)',

  // Brand
  primary: '#7B5EA7',
  primaryLight: '#9B7EC7',
  primaryDark: '#5B3E87',
  accent: '#C4A8FF',
  accentDim: 'rgba(196, 168, 255, 0.3)',
  gold: '#FFD28C',
  goldDim: 'rgba(255, 210, 140, 0.3)',

  // Semantic
  success: '#6ECFB0',
  error: '#FF6B8A',
  warning: '#FFB347',
  info: '#6BB5FF',

  // Text
  textPrimary: '#E8E0FF',
  textSecondary: '#A89EC4',
  textSubtle: '#6A6285',
  textInverse: '#0A0B1A',

  // Borders & Glow
  border: 'rgba(196, 168, 255, 0.15)',
  borderBright: 'rgba(196, 168, 255, 0.4)',
  glowPurple: 'rgba(123, 94, 167, 0.4)',
  glowGold: 'rgba(255, 210, 140, 0.3)',
  glowLilac: 'rgba(196, 168, 255, 0.2)',

  // Tab Bar
  tabBar: '#080918',
  tabBarBorder: 'rgba(196, 168, 255, 0.1)',
  tabActive: '#C4A8FF',
  tabInactive: '#3D3660',

  // Moods
  moodSurreal: '#9B7EC7',
  moodCyberpunk: '#00D4FF',
  moodWatercolor: '#FFB5C8',
  moodNoir: '#8A8A8A',
  moodCosmic: '#FFD28C',
  moodGothic: '#CC4466',
};

export const Fonts = {
  sizes: {
    xs: 11,
    sm: 13,
    md: 16,
    lg: 18,
    xl: 22,
    xxl: 28,
    xxxl: 36,
    display: 48,
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    heavy: '800' as const,
  },
  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.7,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const Shadow = {
  glow: {
    shadowColor: '#7B5EA7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 12,
  },
  glowGold: {
    shadowColor: '#FFD28C',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
};

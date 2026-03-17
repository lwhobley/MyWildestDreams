import type { DreamStyle, SubscriptionPlan } from '@/types';

// ─── Design Tokens ────────────────────────────────────────────────────────────
export const COLORS = {
  void:    '#04030a',
  abyss:   '#070612',
  deep:    '#0d0b1e',
  dusk:    '#141228',
  violet:  '#7b5ea7',
  teal:    '#4ecdc4',
  rose:    '#c77dff',
  gold:    '#ffd166',
  blue:    '#48cae4',
  silver:  'rgba(200,200,220,0.85)',
  dim:     'rgba(200,200,220,0.35)',
  ghost:   'rgba(200,200,220,0.12)',
  glass:   'rgba(255,255,255,0.04)',
  glassE:  'rgba(255,255,255,0.08)',
  error:   '#ff6b6b',
  success: '#4ecdc4',
  warning: '#ffd166',
} as const;

export const FONTS = {
  display:  'CormorantGaramond-LightItalic',
  displayR: 'CormorantGaramond-Light',
  body:     'Jost-ExtraLight',
  bodyR:    'Jost-Light',
  label:    'Jost-Regular',
} as const;

export const SPACING = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
  xxl: 48,
  xxxl: 64,
} as const;

export const RADIUS = {
  sm: 4,
  md: 8,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

// ─── Dream Styles ─────────────────────────────────────────────────────────────
export const DREAM_STYLES: Record<DreamStyle, { label: string; emoji: string; description: string; tier: 'free' | 'lucid' | 'oracle' }> = {
  surreal:       { label: 'Surreal',        emoji: '🌊', description: 'Fluid, dreamlike imagery with impossible physics', tier: 'free' },
  cyberpunk:     { label: 'Cyberpunk',      emoji: '🌆', description: 'Neon-drenched urban dystopia', tier: 'free' },
  watercolor:    { label: 'Watercolor',     emoji: '🎨', description: 'Soft, bleeding pigments and gentle washes', tier: 'free' },
  noir:          { label: 'Noir',           emoji: '🖤', description: 'High-contrast black and white with shadow drama', tier: 'lucid' },
  cosmic:        { label: 'Cosmic',         emoji: '🌌', description: 'Nebulae, stardust and infinite space', tier: 'lucid' },
  anime:         { label: 'Anime',          emoji: '⛩️', description: 'Studio Ghibli-esque painterly animation', tier: 'lucid' },
  gothic:        { label: 'Gothic',         emoji: '🕸️', description: 'Dark romanticism with ornate architecture', tier: 'lucid' },
  vintage:       { label: 'Vintage Film',   emoji: '📽️', description: 'Grainy 16mm with faded color palettes', tier: 'lucid' },
  impressionist: { label: 'Impressionist',  emoji: '🖼️', description: 'Monet-style dappled light and brushstrokes', tier: 'lucid' },
  dreamcore:     { label: 'Dreamcore',      emoji: '✨', description: 'Liminal spaces and uncanny familiar places', tier: 'oracle' },
  vaporwave:     { label: 'Vaporwave',      emoji: '🌸', description: 'Pastel synthwave aesthetic with grid horizons', tier: 'oracle' },
  oil_painting:  { label: 'Oil Painting',   emoji: '🎭', description: 'Rich chiaroscuro in the style of old masters', tier: 'oracle' },
  pencil_sketch: { label: 'Pencil Sketch',  emoji: '✏️', description: 'Raw graphite lines with hatched shadows', tier: 'oracle' },
  neon_noir:     { label: 'Neon Noir',      emoji: '🔴', description: 'Blade Runner rain-slicked streets at night', tier: 'oracle' },
} as const;

// ─── Subscription Plans ───────────────────────────────────────────────────────
export const PLANS: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'Dreamer',
    tagline: 'Begin your journey',
    monthlyPrice: 0,
    annualPrice: 0,
    annualSavingsPercent: 0,
    stripeMonthlyPriceId: '',
    stripeAnnualPriceId: '',
    features: [
      { label: '3 dreams per month', included: true },
      { label: 'Basic HD rendering', included: true },
      { label: '3 visual styles', included: true },
      { label: '30-day archive', included: true },
      { label: 'Symbolism Engine', included: false },
      { label: 'Community access', included: false },
      { label: 'Priority rendering', included: false },
    ],
    limits: {
      dreamsPerMonth: 3,
      archiveDays: 30,
      stylesAvailable: 3,
      communityAccess: false,
      symbolismEngine: false,
      priorityRendering: false,
      dreamCoach: false,
      patternAnalysis: false,
    },
  },
  {
    id: 'lucid',
    name: 'Lucid',
    tagline: 'For the dedicated dreamer',
    monthlyPrice: 9,
    annualPrice: 79,
    annualSavingsPercent: 27,
    stripeMonthlyPriceId: process.env.STRIPE_PRICE_LUCID_MONTHLY ?? '',
    stripeAnnualPriceId: process.env.STRIPE_PRICE_LUCID_ANNUAL ?? '',
    features: [
      { label: 'Unlimited dreams', included: true, highlight: true },
      { label: 'Cinematic HD rendering', included: true },
      { label: 'All 14 visual styles', included: true, highlight: true },
      { label: 'Unlimited archive + search', included: true },
      { label: 'Symbolism Engine', included: true, highlight: true },
      { label: 'Community access', included: true },
      { label: 'Priority rendering', included: false },
    ],
    limits: {
      dreamsPerMonth: 'unlimited',
      archiveDays: 'unlimited',
      stylesAvailable: 'all',
      communityAccess: true,
      symbolismEngine: true,
      priorityRendering: false,
      dreamCoach: false,
      patternAnalysis: false,
    },
  },
  {
    id: 'oracle',
    name: 'Oracle',
    tagline: 'For those who go deeper',
    monthlyPrice: 19,
    annualPrice: 159,
    annualSavingsPercent: 30,
    stripeMonthlyPriceId: process.env.STRIPE_PRICE_ORACLE_MONTHLY ?? '',
    stripeAnnualPriceId: process.env.STRIPE_PRICE_ORACLE_ANNUAL ?? '',
    features: [
      { label: 'Everything in Lucid', included: true },
      { label: 'Priority rendering queue', included: true, highlight: true },
      { label: 'AI dream pattern analysis', included: true, highlight: true },
      { label: 'Private dream coach', included: true, highlight: true },
      { label: 'Monthly symbolism report', included: true },
      { label: 'Early access to new features', included: true },
    ],
    limits: {
      dreamsPerMonth: 'unlimited',
      archiveDays: 'unlimited',
      stylesAvailable: 'all',
      communityAccess: true,
      symbolismEngine: true,
      priorityRendering: true,
      dreamCoach: true,
      patternAnalysis: true,
    },
  },
];

// ─── Render Pipeline Steps ────────────────────────────────────────────────────
export const RENDER_STEPS = [
  { key: 'transcribing',       label: 'Transcribing voice',       emoji: '🎙️' },
  { key: 'parsing_entities',   label: 'Parsing dream entities',   emoji: '🧠' },
  { key: 'mapping_symbols',    label: 'Mapping symbols',          emoji: '🗺️' },
  { key: 'applying_style',     label: 'Applying visual style',    emoji: '🎨' },
  { key: 'generating_frames',  label: 'Generating frames',        emoji: '🎬' },
  { key: 'composing_audio',    label: 'Composing soundscape',     emoji: '🎵' },
  { key: 'encoding_video',     label: 'Encoding dreamscape',      emoji: '✨' },
  { key: 'uploading',          label: 'Saving to your library',   emoji: '📚' },
] as const;

// ─── Community ────────────────────────────────────────────────────────────────
export const COMMUNITY_VIBES = ['🌊','🔥','💜','😱','✨','🌙','❄️','💫','🖤','🌸'];

// ─── Notifications ────────────────────────────────────────────────────────────
export const MORNING_REMINDER_MESSAGES = [
  "Your dream is still fresh. Don't let it fade.",
  "You were somewhere extraordinary last night. Tell us.",
  "The subconscious spoke. What did it say?",
  "Capture it before the day takes over.",
  "Last night's film is ready to be made.",
];

// ─── Misc ─────────────────────────────────────────────────────────────────────
export const FREE_TIER_DREAM_LIMIT = 3;
export const MAX_RECORDING_SECONDS = 300; // 5 minutes
export const MIN_RECORDING_SECONDS = 5;
export const RENDER_POLL_INTERVAL_MS = 3000;
export const STREAK_TIMEZONE_BUFFER_HOURS = 3;

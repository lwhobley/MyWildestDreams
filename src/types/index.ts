// ─── Core Domain Types ────────────────────────────────────────────────────────

export type SubscriptionTier = 'free' | 'lucid' | 'oracle';

export type DreamStyle =
  | 'surreal'
  | 'cyberpunk'
  | 'watercolor'
  | 'noir'
  | 'cosmic'
  | 'anime'
  | 'gothic'
  | 'vintage'
  | 'impressionist'
  | 'dreamcore'
  | 'vaporwave'
  | 'oil_painting'
  | 'pencil_sketch'
  | 'neon_noir';

export type DreamEmotion =
  | 'anxious'
  | 'euphoric'
  | 'confused'
  | 'serene'
  | 'fearful'
  | 'curious'
  | 'melancholic'
  | 'exhilarated'
  | 'unsettled'
  | 'peaceful';

export type DreamTag =
  | 'lucid'
  | 'recurring'
  | 'vivid'
  | 'nightmare'
  | 'prophetic'
  | 'nostalgic'
  | 'surreal'
  | 'erotic'
  | 'spiritual';

// ─── Symbol ───────────────────────────────────────────────────────────────────
export interface DreamSymbol {
  id: string;
  name: string;
  emoji: string;
  archetype: string;
  meaning: string;
  themes: string[];
  frequency: number; // how often it appears in user's dreams (0-1)
}

// ─── Dream ────────────────────────────────────────────────────────────────────
export interface Dream {
  id: string;
  userId: string;
  createdAt: string;         // ISO timestamp
  title: string;             // AI-generated title
  rawTranscription: string;  // unedited voice capture
  editedTranscription: string;
  style: DreamStyle;
  styleOverride: boolean;    // true = user chose, false = AI recommended
  emotions: DreamEmotion[];
  tags: DreamTag[];
  symbols: DreamSymbol[];
  narrativeArcs: string[];
  audioUrl: string | null;   // recorded voice file in Supabase Storage
  videoUrl: string | null;   // rendered dreamscape video
  thumbnailUrl: string | null;
  durationSeconds: number;   // video duration
  renderStatus: RenderStatus;
  isPrivate: boolean;
  isFavorited: boolean;
  isShared: boolean;         // shared to community feed
  shareId: string | null;    // anonymous share token
  metadata: DreamMetadata;
}

export type RenderStatus =
  | 'pending'
  | 'transcribing'
  | 'parsing'
  | 'styling'
  | 'rendering'
  | 'complete'
  | 'failed';

export interface DreamMetadata {
  wordCount: number;
  recordingDurationSeconds: number;
  symbolCount: number;
  emotionIntensity: number;   // 0-1 scale
  aiStyleSuggestion: DreamStyle;
  aiConfidence: number;       // 0-1
  renderTimeSeconds: number;
  modelVersions: {
    parser: string;
    renderer: string;
    audio: string;
  };
}

// ─── User / Auth ─────────────────────────────────────────────────────────────
export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  tier: SubscriptionTier;
  stripeCustomerId: string | null;
  streakCount: number;
  lastDreamDate: string | null;
  totalDreams: number;
  onboardingCompleted: boolean;
  preferences: UserPreferences;
  createdAt: string;
}

export interface UserPreferences {
  localModeEnabled: boolean;
  notificationsEnabled: boolean;
  morningReminderTime: string; // "07:00"
  voiceOnlyMode: boolean;
  autoStyleSuggestion: boolean;
  defaultStyle: DreamStyle;
  privacyLevel: 'private' | 'friends' | 'community';
  captioningEnabled: boolean;
  highContrastMode: boolean;
}

// ─── Community ────────────────────────────────────────────────────────────────
export interface CommunityPost {
  id: string;
  shareId: string;
  dreamId: string;
  anonymousHandle: string;   // e.g. "Shadow Dreamer #4291"
  excerpt: string;           // truncated dream text
  style: DreamStyle;
  emotions: DreamEmotion[];
  symbols: string[];
  thumbnailUrl: string | null;
  vibes: string[];           // emoji reactions
  vibeCount: Record<string, number>;
  commentCount: number;
  isReported: boolean;
  createdAt: string;
}

// ─── Rendering Pipeline ───────────────────────────────────────────────────────
export interface RenderJob {
  jobId: string;
  dreamId: string;
  status: RenderStatus;
  progress: number;          // 0-100
  currentStep: RenderStep;
  estimatedSecondsRemaining: number;
  error: string | null;
  startedAt: string;
  completedAt: string | null;
}

export type RenderStep =
  | 'transcribing'
  | 'parsing_entities'
  | 'mapping_symbols'
  | 'applying_style'
  | 'generating_frames'
  | 'composing_audio'
  | 'encoding_video'
  | 'uploading';

// ─── Subscription ─────────────────────────────────────────────────────────────
export interface SubscriptionPlan {
  id: SubscriptionTier;
  name: string;
  tagline: string;
  monthlyPrice: number;
  annualPrice: number;
  annualSavingsPercent: number;
  features: PlanFeature[];
  limits: PlanLimits;
  stripeMonthlyPriceId: string;
  stripeAnnualPriceId: string;
}

export interface PlanFeature {
  label: string;
  included: boolean;
  highlight?: boolean;
}

export interface PlanLimits {
  dreamsPerMonth: number | 'unlimited';
  archiveDays: number | 'unlimited';
  stylesAvailable: number | 'all';
  communityAccess: boolean;
  symbolismEngine: boolean;
  priorityRendering: boolean;
  dreamCoach: boolean;
  patternAnalysis: boolean;
}

// ─── Navigation ──────────────────────────────────────────────────────────────
export type RootStackParamList = {
  '(auth)': undefined;
  '(onboarding)': undefined;
  '(app)': undefined;
};

export type AuthStackParamList = {
  'login': undefined;
  'register': undefined;
  'forgot-password': undefined;
};

export type OnboardingStackParamList = {
  'step-1': undefined;
  'step-2': undefined;
  'step-3': undefined;
  'step-4': undefined;
};

export type AppTabParamList = {
  'home': undefined;
  'capture': undefined;
  'library': undefined;
  'community': undefined;
  'settings': undefined;
};

export type AppStackParamList = {
  'dream/[id]': { id: string };
  'dream/[id]/playback': { id: string };
  'dream/[id]/symbolism': { id: string };
  'rendering/[jobId]': { jobId: string };
  'settings/subscription': undefined;
  'settings/privacy': undefined;
  'settings/notifications': undefined;
  'community/post/[shareId]': { shareId: string };
};

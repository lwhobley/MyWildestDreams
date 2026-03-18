import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { UserProfile } from '@/types';

interface AuthState {
  user: UserProfile | null;
  session: { accessToken: string; userId: string } | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // Actions
  initialize: () => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updatePreferences: (prefs: Partial<UserProfile['preferences']>) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  isLoading: true,
  isAuthenticated: false,

  initialize: async () => {
    set({ isLoading: true });
    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      set({
        session: { accessToken: session.access_token, userId: session.user.id },
        user: profile as unknown as UserProfile ?? null,
        isAuthenticated: !!profile,
        isLoading: false,
      });
    } else {
      set({ isLoading: false, isAuthenticated: false });
    }

    // Listen for auth changes
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        set({ user: null, session: null, isAuthenticated: false });
      } else if (session) {
        await get().refreshProfile();
      }
    });
  },

  signUp: async (email, password, displayName) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw new Error(error.message);
    if (!data.user) throw new Error('Registration failed.');

    // Create profile
    const { error: profileError } = await supabase.from('profiles').insert({
      id: data.user.id,
      email,
      display_name: displayName,
      tier: 'free',
      streak_count: 0,
      total_dreams: 0,
      onboarding_completed: false,
      trial_ends_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3-day trial
      preferences: {
        localModeEnabled: false,
        notificationsEnabled: true,
        morningReminderTime: '07:00',
        voiceOnlyMode: false,
        autoStyleSuggestion: true,
        defaultStyle: 'surreal',
        privacyLevel: 'private',
        captioningEnabled: false,
        highContrastMode: false,
      },
    });
    if (profileError) throw new Error(profileError.message);
  },

  signIn: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    await get().refreshProfile();
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, session: null, isAuthenticated: false });
  },

  refreshProfile: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profile) {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      set({
        user: profile as unknown as UserProfile,
        isAuthenticated: true,
        session: currentSession
          ? { accessToken: currentSession.access_token, userId: user.id }
          : null,
      });
    }
  },

  updatePreferences: async (prefs) => {
    const current = get().user;
    if (!current) return;

    const updated = { ...current.preferences, ...prefs };
    await supabase
      .from('profiles')
      .update({ preferences: updated })
      .eq('id', current.id);

    set({ user: { ...current, preferences: updated } });
  },
}));

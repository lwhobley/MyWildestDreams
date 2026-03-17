// src/stores/index.ts
// ─── Zustand Global Store · Dreams + Auth + UI ───────────────────────────────

import { create } from 'zustand';
import { supabase } from '@/lib/supabase/client';
import type { Dream, UserProfile, SubscriptionTier, DreamRenderStatus } from '@/types';
import type { VisualStyleId } from '@/theme/tokens';

// ─── AUTH STORE ───────────────────────────────────────────────────────────────

interface AuthState {
  user: UserProfile | null;
  isLoading: boolean;
  isOnboarded: boolean;
  setUser: (user: UserProfile | null) => void;
  setOnboarded: (val: boolean) => void;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isOnboarded: false,

  setUser: (user) => set({ user, isLoading: false }),
  setOnboarded: (val) => set({ isOnboarded: val }),

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null });
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
      set({
        user: {
          id: profile.id,
          email: profile.email,
          displayName: profile.display_name ?? profile.email.split('@')[0],
          avatarUrl: profile.avatar_url,
          tier: profile.tier as SubscriptionTier,
          streakCount: profile.streak_count,
          totalDreams: profile.total_dreams,
          joinedAt: profile.created_at,
          localModeEnabled: profile.local_mode,
          notificationsEnabled: profile.notifications,
        },
        isLoading: false,
      });
    }
  },
}));

// ─── DREAM CAPTURE STORE ──────────────────────────────────────────────────────

interface CaptureState {
  selectedStyle: VisualStyleId;
  transcription: string;
  currentDreamId: string | null;
  renderStatus: DreamRenderStatus;
  renderProgress: number;

  setStyle: (style: VisualStyleId) => void;
  setTranscription: (text: string) => void;
  setCurrentDreamId: (id: string | null) => void;
  setRenderStatus: (status: DreamRenderStatus, progress: number) => void;
  reset: () => void;
}

export const useCaptureStore = create<CaptureState>((set) => ({
  selectedStyle: 'surreal',
  transcription: '',
  currentDreamId: null,
  renderStatus: 'idle',
  renderProgress: 0,

  setStyle: (style) => set({ selectedStyle: style }),
  setTranscription: (text) => set({ transcription: text }),
  setCurrentDreamId: (id) => set({ currentDreamId: id }),
  setRenderStatus: (status, progress) => set({ renderStatus: status, renderProgress: progress }),
  reset: () => set({
    transcription: '',
    currentDreamId: null,
    renderStatus: 'idle',
    renderProgress: 0,
  }),
}));

// ─── DREAM LIBRARY STORE ──────────────────────────────────────────────────────

type LibraryFilter = 'all' | 'recurring' | 'lucid' | 'vivid' | 'nightmares' | 'favorites';

interface LibraryState {
  dreams: Dream[];
  isLoading: boolean;
  filter: LibraryFilter;
  searchQuery: string;
  selectedDream: Dream | null;

  setFilter: (filter: LibraryFilter) => void;
  setSearchQuery: (q: string) => void;
  setSelectedDream: (dream: Dream | null) => void;
  fetchDreams: (userId: string) => Promise<void>;
  toggleFavorite: (dreamId: string) => Promise<void>;
  deleteDream: (dreamId: string) => Promise<void>;
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  dreams: [],
  isLoading: false,
  filter: 'all',
  searchQuery: '',
  selectedDream: null,

  setFilter: (filter) => set({ filter }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setSelectedDream: (dream) => set({ selectedDream: dream }),

  fetchDreams: async (userId: string) => {
    set({ isLoading: true });
    try {
      let query = supabase
        .from('dreams')
        .select('*')
        .eq('user_id', userId)
        .eq('render_status', 'complete')
        .order('created_at', { ascending: false });

      const { filter, searchQuery } = get();

      if (filter === 'favorites') query = query.eq('is_favorite', true);
      else if (filter !== 'all') query = query.contains('tags', [filter]);

      if (searchQuery) {
        query = query.textSearch('raw_transcription', searchQuery, { type: 'websearch' });
      }

      const { data, error } = await query;
      if (error) throw error;

      set({ dreams: (data ?? []) as Dream[] });
    } catch (err) {
      console.error('[LibraryStore] fetchDreams error:', err);
    } finally {
      set({ isLoading: false });
    }
  },

  toggleFavorite: async (dreamId: string) => {
    const dream = get().dreams.find(d => d.id === dreamId);
    if (!dream) return;

    const newVal = !dream.isFavorite;

    set(state => ({
      dreams: state.dreams.map(d =>
        d.id === dreamId ? { ...d, isFavorite: newVal } : d
      ),
    }));

    await supabase
      .from('dreams')
      .update({ is_favorite: newVal })
      .eq('id', dreamId);
  },

  deleteDream: async (dreamId: string) => {
    set(state => ({
      dreams: state.dreams.filter(d => d.id !== dreamId),
    }));

    await supabase
      .from('dreams')
      .delete()
      .eq('id', dreamId);
  },
}));

// ─── UI STORE ─────────────────────────────────────────────────────────────────

interface UIState {
  toastMessage: string | null;
  toastType: 'success' | 'error' | 'info';
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  clearToast: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  toastMessage: null,
  toastType: 'info',

  showToast: (msg, type = 'info') => {
    set({ toastMessage: msg, toastType: type });
    setTimeout(() => set({ toastMessage: null }), 3500);
  },
  clearToast: () => set({ toastMessage: null }),
}));

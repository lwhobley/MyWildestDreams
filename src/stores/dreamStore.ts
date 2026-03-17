import { create } from 'zustand';
import type { Dream, DreamStyle, RenderJob } from '@/types';
import { listDreams, toggleFavorite } from '@/services/dreamService';

interface DreamState {
  dreams: Dream[];
  activeDream: Dream | null;
  activeRenderJob: RenderJob | null;
  isLoading: boolean;
  hasMore: boolean;
  offset: number;

  // Actions
  loadDreams: (userId: string, reset?: boolean) => Promise<void>;
  loadMore: (userId: string) => Promise<void>;
  setActiveDream: (dream: Dream | null) => void;
  setActiveRenderJob: (job: RenderJob | null) => void;
  updateDreamInList: (dreamId: string, updates: Partial<Dream>) => void;
  toggleDreamFavorite: (dreamId: string) => Promise<void>;
  removeDream: (dreamId: string) => void;
}

const PAGE_SIZE = 20;

export const useDreamStore = create<DreamState>((set, get) => ({
  dreams: [],
  activeDream: null,
  activeRenderJob: null,
  isLoading: false,
  hasMore: true,
  offset: 0,

  loadDreams: async (userId, reset = false) => {
    set({ isLoading: true, ...(reset && { dreams: [], offset: 0, hasMore: true }) });
    const results = await listDreams({ userId, limit: PAGE_SIZE, offset: 0 });
    set({
      dreams: results,
      offset: results.length,
      hasMore: results.length === PAGE_SIZE,
      isLoading: false,
    });
  },

  loadMore: async (userId) => {
    const { isLoading, hasMore, offset } = get();
    if (isLoading || !hasMore) return;
    set({ isLoading: true });
    const results = await listDreams({ userId, limit: PAGE_SIZE, offset });
    set(state => ({
      dreams: [...state.dreams, ...results],
      offset: offset + results.length,
      hasMore: results.length === PAGE_SIZE,
      isLoading: false,
    }));
  },

  setActiveDream: (dream) => set({ activeDream: dream }),
  setActiveRenderJob: (job) => set({ activeRenderJob: job }),

  updateDreamInList: (dreamId, updates) => set(state => ({
    dreams: state.dreams.map(d => d.id === dreamId ? { ...d, ...updates } : d),
    activeDream: state.activeDream?.id === dreamId
      ? { ...state.activeDream, ...updates }
      : state.activeDream,
  })),

  toggleDreamFavorite: async (dreamId) => {
    const dream = get().dreams.find(d => d.id === dreamId);
    if (!dream) return;
    const newVal = !dream.isFavorited;
    get().updateDreamInList(dreamId, { isFavorited: newVal });
    await toggleFavorite(dreamId, newVal);
  },

  removeDream: (dreamId) => set(state => ({
    dreams: state.dreams.filter(d => d.id !== dreamId),
  })),
}));

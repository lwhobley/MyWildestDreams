import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { Dream, getDreams, saveDream, toggleFavorite, deleteDream } from '@/services/dreamService';
import { sendDreamSavedAffirmation } from '@/services/notificationService';

export interface DreamContextType {
  dreams: Dream[];
  isLoading: boolean;
  addDream: (dream: Dream) => Promise<void>;
  toggleDreamFavorite: (id: string) => Promise<void>;
  removeDream: (id: string) => Promise<void>;
  refreshDreams: () => Promise<void>;
}

export const DreamContext = createContext<DreamContextType | undefined>(undefined);

export function DreamProvider({ children }: { children: ReactNode }) {
  const [dreams, setDreams] = useState<Dream[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDreams();
  }, []);

  async function loadDreams() {
    setIsLoading(true);
    const data = await getDreams();
    setDreams(data);
    setIsLoading(false);
  }

  async function addDream(dream: Dream) {
    await saveDream(dream);
    setDreams((prev) => [dream, ...prev]);
    // Fire post-save affirmation notification (no-op if notifications disabled)
    sendDreamSavedAffirmation({ title: dream.title }).catch(() => {});
  }

  async function toggleDreamFavorite(id: string) {
    const updated = await toggleFavorite(id);
    setDreams(updated);
  }

  async function removeDream(id: string) {
    const updated = await deleteDream(id);
    setDreams(updated);
  }

  async function refreshDreams() {
    await loadDreams();
  }

  return (
    <DreamContext.Provider
      value={{ dreams, isLoading, addDream, toggleDreamFavorite, removeDream, refreshDreams }}
    >
      {children}
    </DreamContext.Provider>
  );
}

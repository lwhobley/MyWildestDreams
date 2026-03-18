import { useState, useEffect, useCallback } from 'react';
import { Dream, loadDreams, saveDreams } from '@/services/dreamService';

export function useDreams() {
  const [dreams, setDreams] = useState<Dream[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDreams().then((d) => {
      setDreams(d);
      setIsLoading(false);
    });
  }, []);

  const addDream = useCallback(async (dream: Dream) => {
    const updated = [dream, ...dreams];
    setDreams(updated);
    await saveDreams(updated);
  }, [dreams]);

  const removeDream = useCallback(async (id: string) => {
    const updated = dreams.filter((d) => d.id !== id);
    setDreams(updated);
    await saveDreams(updated);
  }, [dreams]);

  const toggleDreamFavorite = useCallback(async (id: string) => {
    const updated = dreams.map((d) =>
      d.id === id ? { ...d, isFavorite: !d.isFavorite } : d
    );
    setDreams(updated);
    await saveDreams(updated);
  }, [dreams]);

  return { dreams, isLoading, addDream, removeDream, toggleDreamFavorite };
}

import { useContext } from 'react';
import { DreamContext } from '@/contexts/DreamContext';

export function useDreams() {
  const context = useContext(DreamContext);
  if (!context) throw new Error('useDreams must be used within DreamProvider');
  return context;
}

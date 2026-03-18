import AsyncStorage from '@react-native-async-storage/async-storage';
import { APP_CONFIG } from '@/constants/config';

export interface Dream {
  id: string;
  title: string;
  description: string;
  styleId: string;
  moodId: string;
  tags: string[];
  thumbnailIndex: number;
  thumbnailUrl?: string;
  interpretation: string;
  createdAt: string;
  isFavorite: boolean;
  duration: string;
}

export function generateDreamId(): string {
  return 'dream_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
}

export async function loadDreams(): Promise<Dream[]> {
  try {
    const raw = await AsyncStorage.getItem(APP_CONFIG.dreamsStorageKey);
    if (!raw) return [];
    return JSON.parse(raw) as Dream[];
  } catch {
    return [];
  }
}

export async function saveDreams(dreams: Dream[]): Promise<void> {
  await AsyncStorage.setItem(APP_CONFIG.dreamsStorageKey, JSON.stringify(dreams));
}

export async function setOnboardingComplete(): Promise<void> {
  await AsyncStorage.setItem(APP_CONFIG.onboardingKey, 'true');
}

export async function isOnboardingComplete(): Promise<boolean> {
  const val = await AsyncStorage.getItem(APP_CONFIG.onboardingKey);
  return val === 'true';
}

export function calculateStreak(dreams: Dream[]): number {
  if (dreams.length === 0) return 0;
  const sorted = [...dreams].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  let streak = 1;
  let prev = new Date(sorted[0].createdAt);
  prev.setHours(0, 0, 0, 0);
  for (let i = 1; i < sorted.length; i++) {
    const cur = new Date(sorted[i].createdAt);
    cur.setHours(0, 0, 0, 0);
    const diff = (prev.getTime() - cur.getTime()) / (1000 * 60 * 60 * 24);
    if (diff === 1) {
      streak++;
      prev = cur;
    } else {
      break;
    }
  }
  return streak;
}

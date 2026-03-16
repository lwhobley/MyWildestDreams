import { Dream } from '@/services/dreamService';

export const STATIC_THUMBNAILS: Record<number, ReturnType<typeof require>> = {
  1: require('@/assets/images/dream_thumb1.jpg'),
  2: require('@/assets/images/dream_thumb2.jpg'),
  3: require('@/assets/images/dream_thumb3.jpg'),
  4: require('@/assets/images/dream_thumb4.jpg'),
};

export function getThumbnailSource(dream: Pick<Dream, 'thumbnailUrl' | 'thumbnailIndex'>) {
  if (dream.thumbnailUrl) return { uri: dream.thumbnailUrl };
  return STATIC_THUMBNAILS[dream.thumbnailIndex] || STATIC_THUMBNAILS[1];
}

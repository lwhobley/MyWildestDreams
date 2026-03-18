import { Dream } from '@/services/dreamService';

const LOCAL_THUMBS = [
  require('@/assets/images/dream_thumb1.jpg'),
  require('@/assets/images/dream_thumb2.jpg'),
  require('@/assets/images/dream_thumb3.jpg'),
  require('@/assets/images/dream_thumb4.jpg'),
];

export function getThumbnailSource(dream: Dream): any {
  if (dream.thumbnailUrl) {
    return { uri: dream.thumbnailUrl };
  }
  const idx = (dream.thumbnailIndex ?? 0) % LOCAL_THUMBS.length;
  return LOCAL_THUMBS[idx];
}

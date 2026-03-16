import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { isOnboardingComplete } from '@/services/dreamService';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    async function check() {
      const done = await isOnboardingComplete();
      if (done) {
        router.replace('/(tabs)');
      } else {
        router.replace('/onboarding');
      }
    }
    check();
  }, []);

  return null;
}

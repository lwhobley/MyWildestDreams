import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Index() {
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('onboarding_completed').then((val) => {
      setOnboardingDone(val === 'true');
    });
  }, []);

  if (onboardingDone === null) return null;
  if (!onboardingDone) return <Redirect href="/onboarding" />;
  return <Redirect href="/(tabs)" />;
}

/**
 * Onboarding Step 3
 * Map to UI from prototype screen Onboard3
 * On complete (step 4): mark onboarding_completed, redirect to /(app)/home
 */
import { View, Text } from 'react-native';
import { COLORS } from '@/constants';
export default function OnboardStep3() {
  return (
    <View style={{ flex: 1, backgroundColor: COLORS.void, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: COLORS.silver }}>Onboarding Step 3</Text>
    </View>
  );
}

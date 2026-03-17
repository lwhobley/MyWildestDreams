/**
 * Rendering Screen — navigated to after capture completes
 * Connects to: useRenderJob(jobId, dreamId)
 * Progress polling via Supabase Realtime
 * On complete → router.replace('/dream/[id]/playback')
 */
import { View, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useRenderJob } from '@/hooks/useRenderJob';
import { COLORS, RENDER_STEPS } from '@/constants';

export default function RenderingScreen() {
  const { jobId, dreamId } = useLocalSearchParams<{ jobId: string; dreamId: string }>();
  const { job, error, isComplete } = useRenderJob(jobId, dreamId);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.void, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: COLORS.silver }}>
        Rendering... {job?.progress ?? 0}% — {job?.currentStep}
      </Text>
    </View>
  );
}

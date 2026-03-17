import { View, Text } from 'react-native';
import { COLORS } from '@/constants';
export default function PrivacyScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: COLORS.void }}>
      <Text style={{ color: COLORS.silver }}>Privacy Settings</Text>
    </View>
  );
}

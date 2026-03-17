import { Tabs } from 'expo-router';
import { Colors } from '@/constants/theme';
import { Text, View } from 'react-native';

function TabIcon({ emoji, focused, color }: { emoji: string; focused: boolean; color: string }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ fontSize: focused ? 18 : 16, opacity: focused ? 1 : 0.35 }}>{emoji}</Text>
    </View>
  );
}

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: 'rgba(4,3,10,0.97)',
          borderTopColor: 'rgba(255,255,255,0.05)',
          borderTopWidth: 1,
          height: 80,
          paddingBottom: 16,
        },
        tabBarActiveTintColor: Colors.tabActive,
        tabBarInactiveTintColor: Colors.tabInactive,
        tabBarLabelStyle: {
          fontSize: 9,
          letterSpacing: 1.5,
          textTransform: 'uppercase',
          fontFamily: 'Jost-Regular',
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused, color }) => <TabIcon emoji="🌙" focused={focused} color={color} />,
        }}
      />
      <Tabs.Screen
        name="capture"
        options={{
          title: 'Record',
          tabBarIcon: ({ focused, color }) => <TabIcon emoji="◉" focused={focused} color={color} />,
          tabBarActiveTintColor: '#c77dff',
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: 'Library',
          tabBarIcon: ({ focused, color }) => <TabIcon emoji="⟁" focused={focused} color={color} />,
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: 'Community',
          tabBarIcon: ({ focused, color }) => <TabIcon emoji="◈" focused={focused} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ focused, color }) => <TabIcon emoji="◌" focused={focused} color={color} />,
        }}
      />
    </Tabs>
  );
}

import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router/js-tabs';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';

import { colors } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

function tabIcon(name: IconName) {
  function TabIcon({ color }: { color: ColorValue }) {
    return <Ionicons name={name} size={28} color={color as string} />;
  }
  return TabIcon;
}

/** 하단 탭 4개: 홈 / 기록 / 신발 / 내 정보 */
export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: { fontSize: 15, fontWeight: '700' },
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          minHeight: 72,
          paddingTop: 6,
        },
      }}>
      <Tabs.Screen name="index" options={{ title: '홈', tabBarIcon: tabIcon('home') }} />
      <Tabs.Screen name="runs" options={{ title: '기록', tabBarIcon: tabIcon('footsteps') }} />
      <Tabs.Screen name="shoes" options={{ title: '신발', tabBarIcon: tabIcon('pricetag') }} />
      <Tabs.Screen name="me" options={{ title: '내 정보', tabBarIcon: tabIcon('person') }} />
    </Tabs>
  );
}

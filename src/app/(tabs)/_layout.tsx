import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState, type ComponentProps } from 'react';
import type { ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getProfile } from '@/db/profile';
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
  // 안드로이드 하단 버튼(내비게이션 바) 높이만큼 탭 바를 키워야 글씨가 가려지지 않는다.
  const insets = useSafeAreaInsets();
  const db = useSQLiteContext();
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);

  useEffect(() => {
    getProfile(db).then((p) => setHasProfile(p !== null));
  }, [db]);

  // 프로필이 없으면(앱을 처음 켰으면) 온보딩 질문부터
  if (hasProfile === null) return null;
  if (!hasProfile) return <Redirect href="/onboarding" />;

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
          height: 72 + insets.bottom,
          paddingTop: 8,
        },
      }}>
      <Tabs.Screen name="index" options={{ title: '홈', tabBarIcon: tabIcon('home') }} />
      <Tabs.Screen name="runs" options={{ title: '기록', tabBarIcon: tabIcon('footsteps') }} />
      <Tabs.Screen name="shoes" options={{ title: '신발', tabBarIcon: tabIcon('pricetag') }} />
      <Tabs.Screen name="me" options={{ title: '내 정보', tabBarIcon: tabIcon('person') }} />
    </Tabs>
  );
}

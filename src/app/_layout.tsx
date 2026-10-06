import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { DATABASE_NAME, migrate } from '@/db';
import { colors, spacing } from '@/theme';

export default function RootLayout() {
  const [dbError, setDbError] = useState<Error | null>(null);

  if (dbError) {
    return (
      <View style={styles.error}>
        <AppText variant="title">저장 공간을 여는 중 문제가 생겼어요</AppText>
        <AppText>앱을 완전히 종료했다가 다시 열어 주세요. 계속되면 아래 내용을 개발자에게 알려 주세요.</AppText>
        <AppText variant="caption">{dbError.message}</AppText>
      </View>
    );
  }

  return (
    // 앱이 켜질 때 DB를 열고 migrate()로 테이블을 준비한 뒤에 화면을 보여준다.
    <SQLiteProvider databaseName={DATABASE_NAME} onInit={migrate} onError={setDbError}>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </SQLiteProvider>
  );
}

const styles = StyleSheet.create({
  error: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.md,
    backgroundColor: colors.background,
  },
});

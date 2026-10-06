import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { Card } from '@/components/Card';
import { ChoiceButton } from '@/components/ChoiceButton';
import { Disclaimer } from '@/components/Disclaimer';
import { MetricChart } from '@/components/MetricChart';
import { listInbody, type InbodyLog } from '@/db/inbody';
import { CHART_METRICS, METRICS, formatValue, type MetricKey } from '@/inbody/metrics';
import { colors, radius, spacing } from '@/theme';
import { formatDateLong } from '@/utils/date';

/** 인바디 기록 목록 + 변화 그래프 */
export default function InbodyListScreen() {
  const db = useSQLiteContext();
  const [logs, setLogs] = useState<InbodyLog[] | null>(null);
  const [metric, setMetric] = useState<MetricKey>('weightKg');

  useFocusEffect(
    useCallback(() => {
      listInbody(db).then(setLogs);
    }, [db]),
  );

  if (!logs) return null;

  const active = CHART_METRICS.find((m) => m.key === metric)!;
  const points = [...logs]
    .reverse() // 그래프는 오래된 날짜부터
    .filter((l) => l[metric] !== null)
    .map((l) => ({ date: l.measuredOn, value: l[metric] as number }));

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Disclaimer />
      <BigButton label="+ 새 인바디 기록" onPress={() => router.push('/inbody/edit')} />

      {logs.length === 0 ? (
        <Card>
          <AppText variant="title">아직 기록이 없어요</AppText>
          <AppText>인바디 결과지 사진을 첨부하고, 보면서 숫자를 입력할 수 있어요.</AppText>
        </Card>
      ) : (
        <>
          <Card>
            <AppText variant="title">변화 그래프</AppText>
            <View style={styles.tabs}>
              {CHART_METRICS.map((m) => (
                <View key={m.key} style={styles.tab}>
                  <ChoiceButton
                    compact
                    label={m.label}
                    selected={metric === m.key}
                    onPress={() => setMetric(m.key)}
                  />
                </View>
              ))}
            </View>
            <MetricChart key={metric} points={points} unit={active.unit} />
          </Card>

          <AppText variant="title" accessibilityRole="header">
            기록 {logs.length}개
          </AppText>
          {logs.map((log) => (
            <Pressable
              key={log.id}
              accessibilityRole="button"
              accessibilityHint="눌러서 수정"
              onPress={() => router.push({ pathname: '/inbody/edit', params: { id: String(log.id) } })}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
              <View style={styles.rowHeader}>
                <AppText bold>{formatDateLong(log.measuredOn)}</AppText>
                <View style={styles.rowIcons}>
                  {log.photoUri ? (
                    <Ionicons name="image" size={22} color={colors.textSecondary} accessibilityLabel="사진 있음" />
                  ) : null}
                  <Ionicons name="chevron-forward" size={22} color={colors.textSecondary} />
                </View>
              </View>
              <AppText variant="caption">
                {METRICS.map((m) => `${m.label} ${formatValue(log[m.key], m.unit)}`).join(' · ')}
              </AppText>
            </Pressable>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  tabs: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  tab: {
    flex: 1,
  },
  row: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  rowPressed: {
    backgroundColor: colors.surface,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowIcons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});

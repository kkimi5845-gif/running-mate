import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { getActiveRun, listFinishedRuns, type Run } from '@/db/runs';
import { formatDuration, formatKm, formatPace } from '@/location/format';
import { averagePaceSecPerKm } from '@/location/geo';
import { computeTotals } from '@/location/totals';
import { colors, radius, spacing } from '@/theme';
import { formatRunTitle } from '@/utils/date';

/** 기록 탭: 러닝 시작, 합산(오늘·이번 주·이번 달), 기록 목록 */
export default function RunsScreen() {
  const db = useSQLiteContext();
  const [runs, setRuns] = useState<Run[] | null>(null);
  const [active, setActive] = useState<Run | null>(null);

  useFocusEffect(
    useCallback(() => {
      listFinishedRuns(db).then(setRuns);
      getActiveRun(db).then(setActive);
    }, [db]),
  );

  const totals = computeTotals(runs ?? [], new Date());

  return (
    <Screen title="기록" subtitle="러닝을 시작하고 지난 기록을 볼 수 있어요">
      {active ? (
        <Card tone="accent">
          <AppText variant="title">{active.status === 'paused' ? '일시정지한 러닝이 있어요' : '러닝 기록 중이에요'}</AppText>
          <AppText>
            지금까지 {formatKm(active.distanceM)}km
          </AppText>
          <BigButton label="이어서 보기" onPress={() => router.push('/run/active')} />
        </Card>
      ) : (
        <BigButton label="러닝 시작" onPress={() => router.push('/run/active')} />
      )}

      <Card>
        <AppText variant="title">달린 거리</AppText>
        <View style={styles.totals}>
          <Total label="오늘" meters={totals.todayM} />
          <Total label="이번 주" meters={totals.weekM} />
          <Total label="이번 달" meters={totals.monthM} />
        </View>
      </Card>

      {runs && runs.length === 0 && (
        <Card>
          <AppText variant="title">아직 기록이 없어요</AppText>
          <AppText variant="caption">위의 &quot;러닝 시작&quot;을 눌러 첫 기록을 남겨 보세요.</AppText>
        </Card>
      )}

      {runs && runs.length > 0 && (
        <>
          <AppText variant="title" accessibilityRole="header">
            지난 기록 {runs.length}개
          </AppText>
          {runs.map((r) => (
            <Pressable
              key={r.id}
              accessibilityRole="button"
              onPress={() => router.push({ pathname: '/run/[id]', params: { id: String(r.id) } })}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
              <View style={styles.rowMain}>
                <AppText variant="caption">{formatRunTitle(r.startedAt)}</AppText>
                <AppText variant="title">{formatKm(r.distanceM)} km</AppText>
                <AppText variant="caption">
                  {formatDuration(r.durationSec)} · 평균 {formatPace(averagePaceSecPerKm(r.distanceM, r.durationSec))}
                </AppText>
              </View>
              <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
            </Pressable>
          ))}
        </>
      )}
    </Screen>
  );
}

function Total({ label, meters }: { label: string; meters: number }) {
  return (
    <View style={styles.total}>
      <AppText variant="caption">{label}</AppText>
      <AppText variant="title">{formatKm(meters)}</AppText>
      <AppText variant="caption">km</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  totals: {
    flexDirection: 'row',
  },
  total: {
    flex: 1,
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowPressed: {
    backgroundColor: colors.surface,
  },
  rowMain: {
    flex: 1,
    gap: spacing.xs,
  },
});

import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { getLastPoint, getPointStats, type PointStats, type StoredPoint } from '@/db/runs';
import { MAX_ACCURACY_M, MAX_SPEED_MPS } from '@/location/geo';
import { colors, radius, spacing } from '@/theme';

type Props = {
  runId: number;
  distanceM: number;
  /** 바뀔 때마다 다시 읽는다 (측정 화면은 1초마다 바뀌는 값을 넘긴다) */
  tick?: number;
  mode?: string | null;
};

/**
 * 개발·테스트용 GPS 확인 정보. 실제 앱(__DEV__ = false)에서는 보이지 않는다.
 * 받은 좌표 수, 거리 계산에 쓴 수, 뺀 이유별 수, 마지막 좌표의 오차를 보여준다.
 */
export function GpsDebugPanel({ runId, distanceM, tick, mode }: Props) {
  const db = useSQLiteContext();
  const [stats, setStats] = useState<PointStats | null>(null);
  const [last, setLast] = useState<StoredPoint | null>(null);
  const [readAt, setReadAt] = useState(0);

  useEffect(() => {
    if (!__DEV__) return;
    getPointStats(db, runId).then(setStats);
    getLastPoint(db, runId).then((p) => {
      setLast(p);
      setReadAt(Date.now());
    });
  }, [db, runId, tick]);

  if (!__DEV__ || !stats) return null;

  const lastAge = last ? Math.max(0, Math.round((readAt - last.t) / 1000)) : null;

  return (
    <View style={styles.box}>
      <AppText variant="caption" bold>
        확인용 정보 (테스트 중에만 보여요)
      </AppText>
      <AppText variant="caption">
        받은 GPS 신호 {stats.total}개 · 거리 계산에 씀 {stats.used}개
      </AppText>
      <AppText variant="caption">
        뺀 신호: 오차 큼({'>'}{MAX_ACCURACY_M}m) {stats.accuracy} · 튐({'>'}
        {MAX_SPEED_MPS}m/s) {stats.speed} · 중복 {stats.duplicate}
      </AppText>
      <AppText variant="caption">
        마지막 신호: {last ? `오차 ${last.accuracy?.toFixed(0) ?? '?'}m${lastAge !== null && lastAge < 600 ? ` · ${lastAge}초 전` : ''}` : '없음'}
      </AppText>
      <AppText variant="caption">
        거리 {distanceM.toFixed(1)}m{mode ? ` · 기록 방식 ${mode}` : ''}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.textSecondary,
  },
});

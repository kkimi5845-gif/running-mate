import { File, Paths } from 'expo-file-system';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { Card } from '@/components/Card';
import { RouteMap } from '@/components/RouteMap';
import { deleteRun, getRun, getRunPoints, type Run, type StoredPoint } from '@/db/runs';
import { formatDuration, formatKm, formatPace } from '@/location/format';
import { averagePaceSecPerKm } from '@/location/geo';
import { buildGpx } from '@/location/gpx';
import { colors, spacing } from '@/theme';
import { formatRunTitle, toISODate } from '@/utils/date';

/** 러닝 요약(끝낸 직후) · 상세(목록에서 눌렀을 때) */
export default function RunDetailScreen() {
  const db = useSQLiteContext();
  const { id, fresh } = useLocalSearchParams<{ id: string; fresh?: string }>();
  const runId = Number(id);
  const isFresh = fresh === '1';

  const [run, setRun] = useState<Run | null | undefined>(undefined);
  const [points, setPoints] = useState<StoredPoint[]>([]);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    (async () => {
      setRun(await getRun(db, runId));
      setPoints(await getRunPoints(db, runId, { onlyUsed: true }));
    })();
  }, [db, runId]);

  if (run === undefined) return null;
  if (run === null) {
    return (
      <View style={styles.content}>
        <AppText>기록을 찾을 수 없어요.</AppText>
      </View>
    );
  }

  const pace = averagePaceSecPerKm(run.distanceM, run.durationSec);
  const tooShort = run.distanceM < 100;
  const title = formatRunTitle(run.startedAt);

  const close = () => (isFresh ? router.replace('/runs') : router.back());

  const exportGpx = async () => {
    setExporting(true);
    try {
      if (!(await Sharing.isAvailableAsync())) {
        Alert.alert('내보내기를 할 수 없어요', '이 휴대폰에서는 파일 공유 기능을 쓸 수 없어요.');
        return;
      }
      const gpx = buildGpx(
        title,
        points.map((p) => ({ t: p.t, lat: p.lat, lng: p.lng, altitude: p.altitude })),
      );
      const file = new File(Paths.cache, `running-${toISODate(new Date(run.startedAt))}-${run.id}.gpx`);
      if (file.exists) file.delete();
      file.create();
      file.write(gpx);
      await Sharing.shareAsync(file.uri, { mimeType: 'application/gpx+xml', dialogTitle: 'GPX 파일 보내기' });
    } catch (e) {
      Alert.alert('내보내지 못했어요', String(e));
    } finally {
      setExporting(false);
    }
  };

  const remove = () => {
    Alert.alert('이 기록을 지울까요?', '지운 기록은 되살릴 수 없어요.', [
      { text: '취소', style: 'cancel' },
      {
        text: '지우기',
        style: 'destructive',
        onPress: async () => {
          await deleteRun(db, run.id);
          close();
        },
      },
    ]);
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: isFresh ? '러닝 완료' : '러닝 기록', headerBackVisible: !isFresh }} />

      {isFresh && (
        <AppText variant="heading" accessibilityRole="header">
          {tooShort ? '기록을 저장했어요' : '수고했어요! 🎉'}
        </AppText>
      )}
      <AppText variant="caption">{title}</AppText>

      <RouteMap points={points.map((p) => ({ latitude: p.lat, longitude: p.lng }))} />

      <View style={styles.hero}>
        <AppText variant="number">
          {formatKm(run.distanceM)}
          <AppText variant="title"> km</AppText>
        </AppText>
      </View>
      <View style={styles.grid}>
        <Stat label="시간" value={formatDuration(run.durationSec)} />
        <Stat label="평균 페이스" value={formatPace(pace)} />
      </View>

      {tooShort && (
        <Card>
          <AppText color={colors.warning} bold>
            달린 거리가 100m보다 짧아요. 시험 삼아 기록한 거라면 지워도 괜찮아요.
          </AppText>
        </Card>
      )}

      {isFresh && <BigButton label="확인" onPress={close} />}
      <BigButton
        label={exporting ? '준비하는 중…' : 'GPX 파일로 내보내기'}
        variant="outline"
        disabled={exporting || points.length < 2}
        onPress={exportGpx}
      />
      <BigButton label="이 기록 지우기" variant="outline" onPress={remove} />
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card style={styles.stat}>
      <AppText variant="caption">{label}</AppText>
      <AppText variant="title">{value}</AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  hero: {
    alignItems: 'center',
  },
  grid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
});

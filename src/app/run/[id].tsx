import { File, Paths } from 'expo-file-system';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { Card } from '@/components/Card';
import { GpsDebugPanel } from '@/components/GpsDebugPanel';
import { RouteMap } from '@/components/RouteMap';
import { ShoeStatusTag, ShoeThumb } from '@/components/ShoeBadge';
import { ShoePicker } from '@/components/ShoePicker';
import { deleteRun, getRun, getRunPoints, type Run, type StoredPoint } from '@/db/runs';
import { listShoes, setLastShoeId, setRunShoe, type Shoe } from '@/db/shoes';
import { formatDuration, formatKm, formatPace } from '@/location/format';
import { averagePaceSecPerKm } from '@/location/geo';
import { buildGpx } from '@/location/gpx';
import { statusMessage } from '@/shoes/status';
import { colors, spacing } from '@/theme';
import { formatRunTitle, toISODate } from '@/utils/date';
import { showError } from '@/utils/errors';

/** 러닝 요약(끝낸 직후) · 상세(목록에서 눌렀을 때) */
export default function RunDetailScreen() {
  const db = useSQLiteContext();
  const { id, fresh } = useLocalSearchParams<{ id: string; fresh?: string }>();
  const runId = Number(id);
  const isFresh = fresh === '1';

  const [run, setRun] = useState<Run | null | undefined>(undefined);
  const [points, setPoints] = useState<StoredPoint[]>([]);
  const [exporting, setExporting] = useState(false);
  const [shoes, setShoes] = useState<Shoe[]>([]);
  const [changingShoe, setChangingShoe] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setRun(await getRun(db, runId));
        setPoints(await getRunPoints(db, runId, { onlyUsed: true }));
        setShoes(await listShoes(db));
      } catch {
        setRun(null); // 읽지 못하면 "찾을 수 없어요" 안내
      }
    })();
  }, [db, runId]);

  const changeShoe = async (shoeId: number | null) => {
    try {
      await setRunShoe(db, runId, shoeId);
      if (isFresh) await setLastShoeId(db, shoeId); // 방금 끝낸 러닝이면 다음 기본값도 바꾼다
      setRun(await getRun(db, runId));
      setShoes(await listShoes(db));
      setChangingShoe(false);
    } catch (e) {
      showError('신발을 바꾸지 못했어요', e);
    }
  };

  if (run === undefined) return null;
  if (run === null) {
    return (
      <View style={styles.content}>
        <AppText>기록을 찾을 수 없어요.</AppText>
      </View>
    );
  }

  const shoe = shoes.find((s) => s.id === run.shoeId) ?? null;
  // 고를 수 있는 신발: 신는 신발 + (보관했더라도) 지금 연결된 신발
  const pickable = shoes.filter((s) => !s.retired || s.id === run.shoeId);
  const shoeNotice = shoe && !shoe.retired ? statusMessage(shoe.status, shoe.replaceKm - shoe.totalKm) : null;

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
      showError('내보내지 못했어요', e);
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
          try {
            await deleteRun(db, run.id);
            close();
          } catch (e) {
            showError('기록을 지우지 못했어요', e);
          }
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

      <Card>
        <AppText variant="title">신은 신발</AppText>
        {changingShoe ? (
          <ShoePicker shoes={pickable} selectedId={run.shoeId} onSelect={changeShoe} />
        ) : shoe ? (
          <View style={styles.shoeRow}>
            <ShoeThumb uri={shoe.photoUri} size={48} />
            <View style={styles.shoeMain}>
              <AppText bold>{shoe.name}</AppText>
              <AppText variant="caption">
                누적 {Math.round(shoe.totalKm)} / {shoe.replaceKm}km
              </AppText>
            </View>
            {shoe.status !== 'ok' && <ShoeStatusTag status={shoe.status} />}
          </View>
        ) : (
          <AppText variant="caption">선택한 신발이 없어요.</AppText>
        )}
        {shoeNotice && !changingShoe && (
          <AppText bold color={shoe?.status === 'replace' ? colors.danger : colors.warning}>
            {shoeNotice}
          </AppText>
        )}
        {pickable.length > 0 && (
          <BigButton
            label={changingShoe ? '닫기' : shoe ? '신발 바꾸기' : '신발 고르기'}
            variant="outline"
            onPress={() => setChangingShoe((v) => !v)}
          />
        )}
      </Card>

      {tooShort && (
        <Card>
          <AppText color={colors.warning} bold>
            달린 거리가 100m보다 짧아요. 시험 삼아 기록한 거라면 지워도 괜찮아요.
          </AppText>
        </Card>
      )}

      <GpsDebugPanel runId={run.id} distanceM={run.distanceM} />

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
  shoeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  shoeMain: {
    flex: 1,
    gap: 2,
  },
});

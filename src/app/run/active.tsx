import Ionicons from '@expo/vector-icons/Ionicons';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { Card } from '@/components/Card';
import {
  createRun,
  deleteRun,
  elapsedSec,
  finishRun,
  getActiveRun,
  getLastPoint,
  getRun,
  getRunPoints,
  pauseRun,
  resumeRun,
  type Run,
  type StoredPoint,
} from '@/db/runs';
import { formatDuration, formatKm, formatPace } from '@/location/format';
import { averagePaceSecPerKm, CURRENT_PACE_WINDOW_MS, currentPaceSecPerKm, MAX_ACCURACY_M } from '@/location/geo';
import { currentTrackingMode, isExpoGo, startTracking, stopTracking, type TrackingMode } from '@/location/tracking';
import { colors, radius, spacing } from '@/theme';

const KEEP_AWAKE_TAG = 'run-active';

/** 러닝 측정 화면: 시작 → (일시정지·재개) → 종료 */
export default function ActiveRunScreen() {
  const db = useSQLiteContext();
  const [loading, setLoading] = useState(true);
  const [run, setRun] = useState<Run | null>(null);
  const [mode, setMode] = useState<TrackingMode | null>(null);
  const [lastPoint, setLastPoint] = useState<StoredPoint | null>(null);
  const [recent, setRecent] = useState<StoredPoint[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);

  // 처음 열 때: 진행 중인 러닝이 있으면 이어서 보여주고, 위치 기록이 꺼져 있으면 다시 켠다.
  useEffect(() => {
    (async () => {
      const active = await getActiveRun(db);
      setRun(active);
      if (active) {
        const running = await currentTrackingMode();
        if (running) setMode(running);
        else {
          const result = await startTracking();
          if (result.ok) setMode(result.mode);
        }
      }
      setLoading(false);
    })();
  }, [db]);

  // 1초마다 DB에서 최신 거리·좌표를 읽어 화면을 갱신한다.
  const runId = run?.id ?? null;
  const refresh = useCallback(async () => {
    if (runId === null) return;
    const t = Date.now();
    const [latest, last, pts] = await Promise.all([
      getRun(db, runId),
      getLastPoint(db, runId),
      getRunPoints(db, runId, { onlyUsed: true, sinceMs: t - CURRENT_PACE_WINDOW_MS }),
    ]);
    if (latest) setRun(latest);
    setLastPoint(last);
    setRecent(pts);
    setNow(t);
  }, [db, runId]);

  useEffect(() => {
    if (runId === null) return;
    const timer = setInterval(refresh, 1000);
    return () => clearInterval(timer);
  }, [runId, refresh]);

  // Expo Go(화면이 켜져 있어야 기록되는 방식)에서는 기록 중 화면이 꺼지지 않게 한다.
  const hasRun = run !== null;
  useEffect(() => {
    if (hasRun && mode === 'foreground') {
      void activateKeepAwakeAsync(KEEP_AWAKE_TAG);
      return () => {
        void deactivateKeepAwake(KEEP_AWAKE_TAG);
      };
    }
  }, [hasRun, mode]);

  const start = async () => {
    setBusy(true);
    try {
      const result = await startTracking();
      if (!result.ok) {
        if (result.reason === 'location-off') {
          Alert.alert('위치(GPS)가 꺼져 있어요', '휴대폰 위쪽 빠른 설정에서 "위치"를 켜 주세요.');
        } else {
          Alert.alert(
            '위치 권한이 필요해요',
            '러닝 거리를 재려면 위치 권한이 필요해요. 설정에서 러닝메이트(또는 Expo Go)의 위치 권한을 허용해 주세요.',
            [
              { text: '닫기', style: 'cancel' },
              { text: '설정 열기', onPress: () => Linking.openSettings() },
            ],
          );
        }
        return;
      }
      setMode(result.mode);
      const id = await createRun(db, Date.now());
      setRun(await getRun(db, id));
    } catch (e) {
      Alert.alert('시작하지 못했어요', String(e));
    } finally {
      setBusy(false);
    }
  };

  const togglePause = async () => {
    if (!run) return;
    setBusy(true);
    try {
      const latest = (await getRun(db, run.id)) ?? run;
      if (latest.status === 'recording') await pauseRun(db, latest, Date.now());
      else await resumeRun(db, latest, Date.now());
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const finish = () => {
    if (!run) return;
    Alert.alert('러닝을 끝낼까요?', '지금까지의 기록을 저장해요.', [
      { text: '계속 달리기', style: 'cancel' },
      {
        text: '끝내기',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await stopTracking();
            const latest = (await getRun(db, run.id)) ?? run;
            await finishRun(db, latest, Date.now());
            router.replace({ pathname: '/run/[id]', params: { id: String(run.id), fresh: '1' } });
          } catch (e) {
            setBusy(false);
            Alert.alert('저장하지 못했어요', String(e));
          }
        },
      },
    ]);
  };

  const cancelRun = () => {
    if (!run) return;
    Alert.alert('이번 러닝을 취소할까요?', '지금까지 기록한 내용이 모두 지워져요.', [
      { text: '아니요', style: 'cancel' },
      {
        text: '취소하고 지우기',
        style: 'destructive',
        onPress: async () => {
          await stopTracking();
          await deleteRun(db, run.id);
          router.back();
        },
      },
    ]);
  };

  if (loading) return null;

  // ── 시작 전 ───────────────────────────────────────
  if (!run) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.content}>
          <Header onClose={() => router.back()} />
          <AppText variant="heading">러닝을 시작할까요?</AppText>
          <Card>
            <AppText variant="title">위치 권한 안내</AppText>
            <AppText>
              달린 거리와 경로를 재기 위해 위치(GPS)를 사용해요. 위치 정보는 이 휴대폰 안에만 저장돼요.
            </AppText>
            {isExpoGo ? (
              <AppText color={colors.warning} bold>
                지금은 테스트용 Expo Go라서 화면이 켜져 있을 때만 기록돼요. 기록 중에는 화면이 꺼지지 않게
                해 둘게요.
              </AppText>
            ) : (
              <AppText>
                화면을 꺼도 기록되게 하려면 위치 권한을 묻는 창에서 <AppText bold>&quot;항상 허용&quot;</AppText>을
                골라 주세요.
              </AppText>
            )}
          </Card>
          <AppText variant="caption">
            건물 안이나 높은 건물 사이에서는 GPS가 약해 거리가 정확하지 않을 수 있어요. 탁 트인 곳에서 시작해
            주세요.
          </AppText>
        </ScrollView>
        <View style={styles.footer}>
          <BigButton label={busy ? '준비하는 중…' : '시작하기'} disabled={busy} onPress={start} />
        </View>
      </SafeAreaView>
    );
  }

  // ── 기록 중·일시정지 ───────────────────────────────
  const paused = run.status === 'paused';
  const elapsed = elapsedSec(run, now);
  const avgPace = averagePaceSecPerKm(run.distanceM, elapsed);
  const curPace = paused ? null : currentPaceSecPerKm(recent, now);

  return (
    <SafeAreaView style={[styles.safe, paused && styles.safePaused]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Header onClose={() => router.back()} closeLabel="목록으로" />
        <View style={styles.statusRow}>
          <View style={[styles.badge, paused ? styles.badgePaused : styles.badgeLive]}>
            <AppText bold color={paused ? colors.text : colors.textOnPrimary}>
              {paused ? '일시정지' : '● 기록 중'}
            </AppText>
          </View>
          <GpsSignal last={lastPoint} now={now} paused={paused} />
        </View>

        <View style={styles.hero}>
          <AppText variant="hero" accessibilityLabel={`거리 ${formatKm(run.distanceM)} 킬로미터`}>
            {formatKm(run.distanceM)}
          </AppText>
          <AppText variant="title" color={colors.textSecondary}>
            킬로미터
          </AppText>
        </View>

        <View style={styles.grid}>
          <Stat label="시간" value={formatDuration(elapsed)} />
          <Stat label="평균 페이스" value={formatPace(avgPace)} />
          <Stat label="현재 페이스" value={formatPace(curPace)} />
        </View>

        {mode === 'foreground' && (
          <Card>
            <AppText color={colors.warning} bold>
              {isExpoGo
                ? '테스트 모드: 화면이 켜져 있을 때만 기록돼요.'
                : '"항상 허용" 권한이 없어 화면이 켜져 있을 때만 기록돼요.'}
            </AppText>
          </Card>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.buttonRow}>
          <View style={styles.flex}>
            <BigButton label={paused ? '다시 시작' : '일시정지'} disabled={busy} onPress={togglePause} />
          </View>
          <View style={styles.flex}>
            <BigButton label="끝내기" variant="outline" disabled={busy} onPress={finish} />
          </View>
        </View>
        {paused && (
          <Pressable accessibilityRole="button" onPress={cancelRun} style={styles.cancel}>
            <AppText color={colors.danger} bold>
              이번 러닝 취소하기
            </AppText>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

function Header({ onClose, closeLabel = '닫기' }: { onClose: () => void; closeLabel?: string }) {
  return (
    <Pressable accessibilityRole="button" onPress={onClose} style={styles.close} hitSlop={12}>
      <Ionicons name="chevron-back" size={26} color={colors.text} />
      <AppText bold>{closeLabel}</AppText>
    </Pressable>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <AppText variant="caption">{label}</AppText>
      <AppText variant="title" style={styles.statValue}>
        {value}
      </AppText>
    </View>
  );
}

/** GPS 신호 상태: 마지막 좌표의 정확도와 받은 시각으로 판단 */
function GpsSignal({ last, now, paused }: { last: StoredPoint | null; now: number; paused: boolean }) {
  if (paused) return null;
  let label = 'GPS 찾는 중…';
  let color: string = colors.warning;
  if (last && now - last.t < 10_000 && last.accuracy !== null) {
    if (last.accuracy <= 10) {
      label = 'GPS 좋음';
      color = colors.success;
    } else if (last.accuracy <= MAX_ACCURACY_M) {
      label = 'GPS 보통';
      color = colors.success;
    } else {
      label = 'GPS 약함';
      color = colors.danger;
    }
  }
  return (
    <View style={styles.gps}>
      <Ionicons name="navigate" size={20} color={color} />
      <AppText bold color={color}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safePaused: {
    backgroundColor: colors.surface,
  },
  flex: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  close: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    minHeight: 44,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
  },
  badgeLive: {
    backgroundColor: colors.primary,
  },
  badgePaused: {
    backgroundColor: colors.border,
  },
  gps: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  hero: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  grid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  statValue: {
    fontVariant: ['tabular-nums'],
  },
  footer: {
    padding: spacing.lg,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  cancel: {
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
});

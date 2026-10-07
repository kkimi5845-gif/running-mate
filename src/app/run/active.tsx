import Ionicons from '@expo/vector-icons/Ionicons';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { Card } from '@/components/Card';
import { ChoiceButton } from '@/components/ChoiceButton';
import { GpsDebugPanel } from '@/components/GpsDebugPanel';
import { ShoePicker } from '@/components/ShoePicker';
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
import { listTracks } from '@/db/music';
import { getSetting, isUnwellToday, setSetting } from '@/db/settings';
import { getLastShoeId, listShoes, setLastShoeId, type Shoe } from '@/db/shoes';
import { coachTick, isCoachMuted, setCoachMuted } from '@/coach/coach';
import { expandPlan, parsePlan, positionAt, type RunPlan } from '@/coach/plan';
import { loadEngineInput } from '@/engine/loadInput';
import { recommend } from '@/engine/recommend';
import { isMusicActive, pauseMusic, resumeMusic, startMusic, stopMusic } from '@/music/player';
import type { Track } from '@/music/select';
import { formatDuration, formatKm, formatPace } from '@/location/format';
import { averagePaceSecPerKm, CURRENT_PACE_WINDOW_MS, currentPaceSecPerKm, MAX_ACCURACY_M } from '@/location/geo';
import { currentTrackingMode, isExpoGo, startTracking, stopTracking, type TrackingMode } from '@/location/tracking';
import { colors, radius, spacing } from '@/theme';
import { toISODate } from '@/utils/date';
import { showError } from '@/utils/errors';

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
  const [shoes, setShoes] = useState<Shoe[]>([]);
  const [shoeId, setShoeId] = useState<number | null>(null);
  const shoeChosen = useRef(false);
  // 오늘의 추천 계획 (쉬는 날이면 null) 과 고른 방식
  const [todayPlan, setTodayPlan] = useState<RunPlan | null>(null);
  const [followPlan, setFollowPlan] = useState(true);
  const [muted, setMuted] = useState(isCoachMuted());

  useEffect(() => {
    (async () => {
      const today = new Date();
      const input = await loadEngineInput(db, today, await isUnwellToday(db, toISODate(today)));
      const rec = input ? recommend(input) : null;
      setTodayPlan(rec && !rec.rest && rec.workout ? expandPlan(rec.workout) : null);
    })();
  }, [db]);

  // 배경음악: 넣어 둔 곡 목록과 켜기/끄기 (마지막 선택을 기억)
  const [tracks, setTracks] = useState<Track[]>([]);
  const [musicOn, setMusicOn] = useState(true);
  const [musicPlaying, setMusicPlaying] = useState(isMusicActive());
  useFocusEffect(
    useCallback(() => {
      listTracks(db).then(setTracks);
      getSetting(db, 'music_on').then((v) => setMusicOn(v !== 'off'));
    }, [db]),
  );
  const chooseMusic = (on: boolean) => {
    setMusicOn(on);
    void setSetting(db, 'music_on', on ? 'on' : 'off');
  };
  const toggleMusicNow = () => {
    if (musicPlaying) pauseMusic();
    else resumeMusic();
    setMusicPlaying(!musicPlaying);
  };

  const toggleMute = () => {
    setCoachMuted(!muted);
    setMuted(!muted);
  };

  // 시작 전 신발 목록. 신발 등록 화면에서 돌아와도 다시 읽는다.
  // 기본 선택: 마지막으로 고른 신발 → 신발이 하나뿐이면 그 신발 → 선택 안 함
  useFocusEffect(
    useCallback(() => {
      (async () => {
        const list = (await listShoes(db)).filter((s) => !s.retired);
        setShoes(list);
        if (shoeChosen.current) return;
        const last = await getLastShoeId(db);
        if (last !== null && list.some((s) => s.id === last)) setShoeId(last);
        else if (list.length === 1) setShoeId(list[0].id);
      })();
    }, [db]),
  );

  const chooseShoe = (id: number | null) => {
    shoeChosen.current = true;
    setShoeId(id);
  };

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
    void coachTick(db); // 구간이 바뀌었거나 1km를 지났으면 음성 안내
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
      const plan = followPlan ? todayPlan : null;
      const id = await createRun(db, Date.now(), shoeId, plan);
      await setLastShoeId(db, shoeId);
      setRun(await getRun(db, id));
      if (musicOn && tracks.length > 0) {
        await startMusic(tracks, plan ? plan.segments[0].kind : 'run');
        setMusicPlaying(true);
      }
      void coachTick(db); // 첫 안내 ("준비 걷기 5분으로 시작해요")
    } catch (e) {
      showError('시작하지 못했어요', e);
    } finally {
      setBusy(false);
    }
  };

  const togglePause = async () => {
    if (!run) return;
    setBusy(true);
    try {
      const latest = (await getRun(db, run.id)) ?? run;
      if (latest.status === 'recording') {
        await pauseRun(db, latest, Date.now());
        pauseMusic();
      } else {
        await resumeRun(db, latest, Date.now());
        if (musicPlaying) resumeMusic();
      }
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
            stopMusic();
            const latest = (await getRun(db, run.id)) ?? run;
            await finishRun(db, latest, Date.now());
            router.replace({ pathname: '/run/[id]', params: { id: String(run.id), fresh: '1' } });
          } catch (e) {
            setBusy(false);
            showError('저장하지 못했어요', e);
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
          stopMusic();
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
            <AppText variant="title">어떻게 달릴까요?</AppText>
            {todayPlan ? (
              <ChoiceButton
                label={`오늘의 추천 따라 달리기 (총 ${Math.round(todayPlan.totalSec / 60)}분, 구간마다 음성 안내)`}
                selected={followPlan}
                onPress={() => setFollowPlan(true)}
              />
            ) : (
              <AppText variant="caption">오늘은 쉬는 날이라 추천 구성이 없어요. 가볍게 달리고 싶다면 자유 러닝으로 기록해요.</AppText>
            )}
            <ChoiceButton
              label="자유 러닝 (1km마다 음성 안내)"
              selected={!todayPlan || !followPlan}
              onPress={() => setFollowPlan(false)}
            />
          </Card>
          <Card>
            <AppText variant="title">배경음악</AppText>
            {tracks.length > 0 ? (
              <>
                <ChoiceButton
                  label={`내 음악 틀기 (걷기 ${tracks.filter((t) => t.kind === 'walk').length}곡 · 달리기 ${tracks.filter((t) => t.kind === 'run').length}곡)`}
                  selected={musicOn}
                  onPress={() => chooseMusic(true)}
                />
                <ChoiceButton label="음악 없이 (다른 음악 앱을 쓸 때)" selected={!musicOn} onPress={() => chooseMusic(false)} />
              </>
            ) : (
              <AppText variant="caption">
                넣어 둔 음악이 없어요. 음악 파일을 넣으면 걷기·달리기 구간에 맞춰 바꿔 틀어 드려요.
              </AppText>
            )}
            <BigButton label="음악 넣기·바꾸기" variant="outline" onPress={() => router.push('/music')} />
          </Card>
          <Card>
            <AppText variant="title">오늘 신을 신발</AppText>
            {shoes.length > 0 ? (
              <ShoePicker shoes={shoes} selectedId={shoeId} onSelect={chooseShoe} />
            ) : (
              <AppText variant="caption">
                등록된 신발이 없어요. 신발을 등록하면 달린 거리가 신발에 자동으로 쌓여요.
              </AppText>
            )}
            <BigButton label="+ 신발 등록" variant="outline" onPress={() => router.push('/shoe/edit')} />
          </Card>
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
  const plan = parsePlan(run.planJson);

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

        {plan && <PlanCard plan={plan} elapsed={elapsed} paused={paused} />}

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

        <GpsDebugPanel runId={run.id} distanceM={run.distanceM} tick={now} mode={mode} />

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
        <View style={styles.toggles}>
          <Pressable accessibilityRole="button" onPress={toggleMute} style={styles.mute}>
            <Ionicons name={muted ? 'volume-mute' : 'volume-high'} size={22} color={colors.textSecondary} />
            <AppText bold color={colors.textSecondary}>
              {muted ? '안내 꺼짐' : '안내 켜짐'}
            </AppText>
          </Pressable>
          {isMusicActive() && (
            <Pressable accessibilityRole="button" onPress={toggleMusicNow} style={styles.mute}>
              <Ionicons name={musicPlaying ? 'musical-notes' : 'pause'} size={22} color={colors.textSecondary} />
              <AppText bold color={colors.textSecondary}>
                {musicPlaying ? '음악 켜짐' : '음악 꺼짐'}
              </AppText>
            </Pressable>
          )}
        </View>
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

/** 지금 구간(달리기/걷기)과 남은 시간 */
function PlanCard({ plan, elapsed, paused }: { plan: RunPlan; elapsed: number; paused: boolean }) {
  const pos = positionAt(plan, elapsed);
  const progress = Math.min(1, elapsed / plan.totalSec);

  if (pos.done) {
    return (
      <View style={[styles.plan, styles.planDone]}>
        <AppText variant="title">오늘 계획 완료! 🎉</AppText>
        <AppText>더 달려도 되고, 아래 &quot;끝내기&quot;를 눌러 저장해도 돼요.</AppText>
      </View>
    );
  }

  const s = pos.segment;
  const isRun = s.kind === 'run';
  const phaseLabel =
    s.phase === 'warmup' ? '준비 걷기' : s.phase === 'cooldown' ? '마무리 걷기' : `${s.set} / ${plan.sets}세트`;
  const next = pos.next
    ? `다음: ${pos.next.phase === 'cooldown' ? '마무리 걷기' : pos.next.kind === 'run' ? '달리기' : '걷기'} ${Math.round(pos.next.seconds / 60)}분`
    : '다음: 끝';

  return (
    <View style={[styles.plan, isRun ? styles.planRun : styles.planWalk]}>
      <View style={styles.planTop}>
        <AppText variant="heading" color={isRun ? colors.textOnPrimary : colors.text}>
          {isRun ? '달리기' : '걷기'}
        </AppText>
        <AppText bold color={isRun ? colors.textOnPrimary : colors.textSecondary}>
          {paused ? '일시정지 중' : phaseLabel}
        </AppText>
      </View>
      <AppText variant="number" color={isRun ? colors.textOnPrimary : colors.text}>
        {formatDuration(pos.remainingSec)}
      </AppText>
      <AppText bold color={isRun ? colors.textOnPrimary : colors.textSecondary}>
        {next}
      </AppText>
      <View style={styles.planTrack}>
        <View style={[styles.planFill, { width: `${progress * 100}%` }]} />
      </View>
    </View>
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
  toggles: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xl,
  },
  mute: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    minHeight: 40,
  },
  plan: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    gap: spacing.xs,
  },
  planRun: {
    backgroundColor: colors.primary,
  },
  planWalk: {
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  planDone: {
    backgroundColor: colors.primarySoft,
  },
  planTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planTrack: {
    height: 8,
    marginTop: spacing.sm,
    borderRadius: 4,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  planFill: {
    height: '100%',
    backgroundColor: colors.text,
  },
  cancel: {
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
});

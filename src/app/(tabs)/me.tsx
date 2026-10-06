import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { LOCAL_ONLY } from '@/constants/notices';
import { getDbStatus, LATEST_DB_VERSION, type DbStatus } from '@/db';
import { latestInbody, type InbodyLog } from '@/db/inbody';
import { getProfile } from '@/db/profile';
import { METRICS, formatValue } from '@/inbody/metrics';
import {
  CONTINUOUS_RUN,
  DISCOMFORT_AREAS,
  EXPERIENCE,
  GOAL,
  MINUTES_PER_SESSION,
  labelOf,
  type Profile,
} from '@/profile/options';
import { colors, spacing } from '@/theme';
import { formatDateLong } from '@/utils/date';

/** 내 정보: 프로필 요약, 최근 인바디, 저장 공간 상태 */
export default function MeScreen() {
  const db = useSQLiteContext();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [inbody, setInbody] = useState<InbodyLog | null>(null);
  const [status, setStatus] = useState<DbStatus | null>(null);

  // 수정 화면에서 돌아올 때마다 새로 읽는다
  useFocusEffect(
    useCallback(() => {
      getProfile(db).then(setProfile);
      latestInbody(db).then(setInbody);
      getDbStatus(db).then(setStatus).catch(() => setStatus(null));
    }, [db]),
  );

  const discomfort = profile?.hasDiscomfort
    ? profile.discomfortAreas.length > 0
      ? `있음 (${profile.discomfortAreas.map((a) => labelOf(DISCOMFORT_AREAS, a)).join(', ')})`
      : '있음'
    : '없음';

  return (
    <Screen title="내 정보" subtitle="프로필, 인바디, 설정을 관리해요">
      <Card>
        <AppText variant="title">내 프로필</AppText>
        {profile ? (
          <View style={styles.rows}>
            <Row label="러닝 경험" value={labelOf(EXPERIENCE, profile.experience)} />
            <Row label="쉬지 않고 달리기" value={labelOf(CONTINUOUS_RUN, profile.continuousRun)} />
            <Row label="목표" value={labelOf(GOAL, profile.goal)} />
            <Row
              label="운동 가능"
              value={`주 ${profile.sessionsPerWeek}회 · ${labelOf(MINUTES_PER_SESSION, profile.minutesPerSession)}`}
            />
            <Row label="불편한 곳" value={discomfort} />
          </View>
        ) : (
          <AppText variant="caption">불러오는 중…</AppText>
        )}
        <BigButton label="프로필 수정" variant="outline" onPress={() => router.push('/profile-edit')} />
      </Card>

      <Card>
        <AppText variant="title">인바디·건강 정보</AppText>
        {inbody ? (
          <>
            <AppText variant="caption">최근 측정: {formatDateLong(inbody.measuredOn)}</AppText>
            <View style={styles.rows}>
              {METRICS.map((m) => (
                <Row key={m.key} label={m.label} value={formatValue(inbody[m.key], m.unit)} />
              ))}
            </View>
          </>
        ) : (
          <AppText>아직 입력한 기록이 없어요.</AppText>
        )}
        <BigButton label="+ 새 기록 입력" onPress={() => router.push('/inbody/edit')} />
        <BigButton label="기록·그래프 보기" variant="outline" onPress={() => router.push('/inbody')} />
      </Card>

      <View style={styles.footer}>
        <AppText variant="caption">{LOCAL_ONLY}</AppText>
        {status ? (
          <AppText variant="caption" color={status.version === LATEST_DB_VERSION ? colors.success : colors.danger}>
            저장 공간: DB 버전 {status.version}
            {status.version === LATEST_DB_VERSION ? ' ✓ 정상' : ` (최신: ${LATEST_DB_VERSION})`}
          </AppText>
        ) : null}
      </View>
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <AppText variant="caption" style={styles.rowLabel}>
        {label}
      </AppText>
      <AppText bold style={styles.rowValue}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  rows: {
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  rowLabel: {
    width: 130,
  },
  rowValue: {
    flex: 1,
  },
  footer: {
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.lg,
  },
});

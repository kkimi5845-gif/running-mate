import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';

import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { getDbStatus, LATEST_DB_VERSION, type DbStatus } from '@/db';
import { colors } from '@/theme';

/** 내 정보 (프로필·인바디·설정) — 2단계에서 온보딩·인바디가 들어온다. */
export default function MeScreen() {
  const db = useSQLiteContext();
  const [status, setStatus] = useState<DbStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDbStatus(db)
      .then(setStatus)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, [db]);

  const ok = status?.version === LATEST_DB_VERSION;

  return (
    <Screen title="내 정보" subtitle="프로필, 인바디, 설정을 관리해요">
      <Card>
        <AppText variant="title">저장 공간 상태</AppText>
        {error ? (
          <AppText color={colors.danger}>확인 중 문제가 생겼어요: {error}</AppText>
        ) : !status ? (
          <AppText variant="caption">확인하는 중…</AppText>
        ) : (
          <>
            <AppText bold color={ok ? colors.success : colors.danger}>
              {ok ? `DB 버전 ${status.version} ✓ 정상` : `DB 버전 ${status.version} (최신: ${LATEST_DB_VERSION})`}
            </AppText>
            <AppText variant="caption">테이블 {status.tables.length}개: {status.tables.join(', ')}</AppText>
          </>
        )}
        <AppText variant="caption">모든 기록은 이 휴대폰 안에만 저장되고, 서버로 보내지 않아요.</AppText>
      </Card>
    </Screen>
  );
}

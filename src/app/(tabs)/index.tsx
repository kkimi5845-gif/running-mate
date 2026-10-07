import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';

import { BigButton } from '@/components/BigButton';
import { Disclaimer } from '@/components/Disclaimer';
import { RecommendationCard } from '@/components/RecommendationCard';
import { Screen } from '@/components/Screen';
import { loadEngineInput } from '@/engine/loadInput';
import { recommend } from '@/engine/recommend';
import type { Recommendation } from '@/engine/types';

/** 홈 (오늘의 추천) — 6단계에서 러닝메이트 말풍선이 이 카드 위에 들어온다. */
export default function HomeScreen() {
  const db = useSQLiteContext();
  const [rec, setRec] = useState<Recommendation | null>(null);
  const [sessionsPerWeek, setSessionsPerWeek] = useState(3);

  // 화면에 돌아올 때마다(러닝을 끝냈거나 프로필을 고쳤을 때) 다시 계산한다
  useFocusEffect(
    useCallback(() => {
      loadEngineInput(db, new Date()).then((input) => {
        if (!input) return;
        setSessionsPerWeek(input.profile.sessionsPerWeek);
        setRec(recommend(input));
      });
    }, [db]),
  );

  return (
    <Screen title="오늘의 러닝" subtitle="오늘 달릴지, 쉴지, 어떻게 달릴지 알려드려요">
      {rec && <RecommendationCard rec={rec} sessionsPerWeek={sessionsPerWeek} />}
      {rec && !rec.rest && <BigButton label="러닝 시작" onPress={() => router.push('/run/active')} />}
      <Disclaimer />
    </Screen>
  );
}

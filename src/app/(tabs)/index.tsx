import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';

import { BigButton } from '@/components/BigButton';
import { CourseCard } from '@/components/CourseCard';
import { Disclaimer } from '@/components/Disclaimer';
import { MateBubble } from '@/components/MateBubble';
import { RecommendationCard } from '@/components/RecommendationCard';
import { Screen } from '@/components/Screen';
import { getRunPoints, listCourseCandidates } from '@/db/runs';
import { getMateSettings, isUnwellToday, setUnwellToday, type MateSettings } from '@/db/settings';
import { recommendCourse, type CourseSuggestion } from '@/engine/course';
import { loadEngineInput } from '@/engine/loadInput';
import { recommend } from '@/engine/recommend';
import type { Recommendation } from '@/engine/types';
import { formatKm } from '@/location/format';
import { generateMateMessage } from '@/mate/generateMateMessage';
import type { MateMessage } from '@/mate/types';
import { toISODate } from '@/utils/date';

type HomeState = {
  rec: Recommendation;
  sessionsPerWeek: number;
  mate: MateSettings;
  message: MateMessage;
  unwell: boolean;
  course: CourseSuggestion | null;
  coursePoints: { latitude: number; longitude: number }[];
  hasHistory: boolean;
};

/** 홈 (오늘의 추천): 러닝메이트가 추천 엔진 결과를 말풍선으로 설명한다 */
export default function HomeScreen() {
  const db = useSQLiteContext();
  const [state, setState] = useState<HomeState | null>(null);

  const load = useCallback(async () => {
    const today = new Date();
    const todayKey = toISODate(today);
    const [unwell, mate, candidates] = await Promise.all([
      isUnwellToday(db, todayKey),
      getMateSettings(db),
      listCourseCandidates(db),
    ]);
    const input = await loadEngineInput(db, today, unwell);
    if (!input) return;

    const rec = recommend(input);
    const course = recommendCourse(rec, candidates);
    const coursePoints = course
      ? (await getRunPoints(db, course.runId, { onlyUsed: true })).map((p) => ({ latitude: p.lat, longitude: p.lng }))
      : [];
    const message = await generateMateMessage(rec, mate.tone, {
      name: mate.name,
      courseKm: course ? formatKm(course.distanceM) : null,
    });

    setState({
      rec,
      sessionsPerWeek: input.profile.sessionsPerWeek,
      mate,
      message,
      unwell,
      course,
      coursePoints,
      hasHistory: candidates.length > 0,
    });
  }, [db]);

  // 화면에 돌아올 때마다(러닝을 끝냈거나 설정을 바꿨을 때) 다시 계산한다
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const toggleUnwell = async () => {
    if (!state) return;
    await setUnwellToday(db, toISODate(new Date()), !state.unwell);
    await load();
  };

  return (
    <Screen title="오늘의 러닝" subtitle="오늘 달릴지, 쉴지, 어떻게 달릴지 알려드려요">
      {state && (
        <>
          <MateBubble
            name={state.mate.name}
            tone={state.mate.tone}
            message={state.message}
            voiceOn={state.mate.voiceOn}
          />

          {/* 다른 이유로 쉬는 날에는 강도를 낮출 운동이 없으니 버튼을 숨긴다 */}
          {(!state.rec.rest || state.unwell) && (
            <BigButton
              label={state.unwell ? '컨디션 괜찮아졌어요 (원래 추천 보기)' : '오늘 컨디션이 안 좋아요'}
              variant="outline"
              onPress={toggleUnwell}
            />
          )}

          <RecommendationCard rec={state.rec} sessionsPerWeek={state.sessionsPerWeek} />
          {!state.rec.rest && (
            <>
              <CourseCard course={state.course} points={state.coursePoints} hasHistory={state.hasHistory} />
              <BigButton label="러닝 시작" onPress={() => router.push('/run/active')} />
            </>
          )}
        </>
      )}
      <Disclaimer />
    </Screen>
  );
}

import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';

import { AppText } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { Card } from '@/components/Card';
import { CourseCard } from '@/components/CourseCard';
import { DailyLineCard } from '@/components/DailyLineCard';
import { JejuCourseCard } from '@/components/JejuCourseCard';
import { Disclaimer } from '@/components/Disclaimer';
import { MateBubble } from '@/components/MateBubble';
import { RecommendationCard } from '@/components/RecommendationCard';
import { RestDayCard } from '@/components/RestDayCard';
import { Screen } from '@/components/Screen';
import { getRunPoints, listCourseCandidates } from '@/db/runs';
import { getMateSettings, isUnwellToday, setUnwellToday, type MateSettings } from '@/db/settings';
import { recommendCourse, type CourseSuggestion } from '@/engine/course';
import { jejuTarget, recommendJejuCourses, type JejuPick } from '@/engine/jeju';
import { loadEngineInput } from '@/engine/loadInput';
import { recommend } from '@/engine/recommend';
import type { Recommendation } from '@/engine/types';
import { getHere } from '@/jeju/here';
import { JEJU_COURSES, spokenName } from '@/jeju/courses';
import { formatKm } from '@/location/format';
import { dailyCategory, pickDailyLine, type LineCategory } from '@/mate/dailyLines';
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
  jejuPick: JejuPick | null;
  jejuKm: number | null;
  dayKey: string;
  lineCategory: LineCategory;
};

/** 홈 (오늘의 추천): 러닝메이트가 추천 엔진 결과를 말풍선으로 설명한다 */
export default function HomeScreen() {
  const db = useSQLiteContext();
  const [state, setState] = useState<HomeState | null>(null);
  const [lineOffset, setLineOffset] = useState(0);
  const [loadError, setLoadError] = useState(false);

  const compute = useCallback(async () => {
    const today = new Date();
    const todayKey = toISODate(today);
    const [unwell, mate, candidates, here] = await Promise.all([
      isUnwellToday(db, todayKey),
      getMateSettings(db),
      listCourseCandidates(db),
      getHere(false), // 이미 허용된 경우에만, 휴대폰 안에서 가까운 코스 계산용
    ]);
    const input = await loadEngineInput(db, today, unwell);
    if (!input) return;

    const rec = recommend(input);
    const course = recommendCourse(rec, candidates);
    const coursePoints = course
      ? (await getRunPoints(db, course.runId, { onlyUsed: true })).map((p) => ({ latitude: p.lat, longitude: p.lng }))
      : [];
    const jeju = jejuTarget(rec, input.profile);
    const jejuPick = rec.rest ? null : (recommendJejuCourses(JEJU_COURSES, jeju, { here }).picks[0] ?? null);
    const message = await generateMateMessage(rec, mate.tone, {
      name: mate.name,
      courseKm: course ? formatKm(course.distanceM) : null,
      jejuCourse: jejuPick ? spokenName(jejuPick.course.name) : null,
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
      jejuPick,
      jejuKm: jeju.km,
      dayKey: todayKey,
      lineCategory: dailyCategory(rec, unwell),
    });
  }, [db]);

  // DB를 읽다 문제가 생기면 빈 화면 대신 안내와 "다시 시도" 버튼을 보여 준다
  const load = useCallback(async () => {
    try {
      await compute();
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
  }, [compute]);

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
      {loadError && (
        <Card>
          <AppText variant="title">오늘의 추천을 불러오지 못했어요</AppText>
          <AppText variant="caption">잠시 후 다시 시도해 주세요. 계속되면 앱을 완전히 껐다가 다시 열어 주세요.</AppText>
          <BigButton label="다시 시도" variant="outline" onPress={() => void load()} />
        </Card>
      )}
      {!state && !loadError && <AppText variant="caption">오늘의 추천을 준비하고 있어요…</AppText>}
      {state && (
        <>
          <DailyLineCard
            line={pickDailyLine(state.lineCategory, state.dayKey, lineOffset)}
            onNext={() => setLineOffset((n) => n + 1)}
          />

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

          {/* 쉬는 날에는 러닝메이트가 이유를 이미 말했으니, 같은 내용을 되풀이하지 않고 쉬는 법만 보여 준다 */}
          {state.rec.rest ? (
            <RestDayCard />
          ) : (
            <RecommendationCard rec={state.rec} sessionsPerWeek={state.sessionsPerWeek} />
          )}
          {!state.rec.rest && (
            <>
              <CourseCard course={state.course} points={state.coursePoints} hasHistory={state.hasHistory} />
              <JejuCourseCard pick={state.jejuPick} targetKm={state.jejuKm} />
              <BigButton label="러닝 시작" onPress={() => router.push('/run/active')} />
            </>
          )}
        </>
      )}
      <Disclaimer />
    </Screen>
  );
}

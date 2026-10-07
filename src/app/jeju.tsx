import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { Card } from '@/components/Card';
import { ChoiceButton } from '@/components/ChoiceButton';
import { Disclaimer } from '@/components/Disclaimer';
import { JejuCourseItem } from '@/components/JejuCourseItem';
import { JEJU_NOTICE } from '@/constants/notices';
import { isUnwellToday } from '@/db/settings';
import { jejuTarget, kmText, recommendJejuCourses, type JejuSkipReason, type JejuTarget } from '@/engine/jeju';
import { loadEngineInput } from '@/engine/loadInput';
import { recommend } from '@/engine/recommend';
import { AREA_LABEL, JEJU_COURSES, LEVEL_LABEL, type JejuArea } from '@/jeju/courses';
import { getHere } from '@/jeju/here';
import { spacing } from '@/theme';
import { toISODate } from '@/utils/date';

type Here = { lat: number; lng: number } | null;

const AREAS: (JejuArea | null)[] = [null, 'jeju_city', 'seogwipo', 'east', 'west'];

const SKIP_TEXT: Record<JejuSkipReason, string> = {
  harder: '지금 수준보다 길거나 힘든 코스예요. 실력이 늘면 추천해 드릴게요.',
  rough: '언덕·흙길이 있어서 오늘은 빼 두었어요.',
};

/** 제주 러닝 코스: 오늘 수준에 맞는 코스를 가까운 순서로 */
export default function JejuScreen() {
  const db = useSQLiteContext();
  const [target, setTarget] = useState<JejuTarget | null>(null);
  const [here, setHere] = useState<Here>(null);
  const [area, setArea] = useState<JejuArea | null>(null);
  const [locating, setLocating] = useState(false);
  const [locateFailed, setLocateFailed] = useState(false);

  useEffect(() => {
    void (async () => {
      const today = new Date();
      const unwell = await isUnwellToday(db, toISODate(today));
      const input = await loadEngineInput(db, today, unwell);
      if (input) setTarget(jejuTarget(recommend(input), input.profile));
      setHere(await getHere(false));
    })();
  }, [db]);

  const locate = useCallback(async () => {
    setLocating(true);
    const h = await getHere(true);
    setHere(h);
    setLocateFailed(h === null);
    setLocating(false);
  }, []);

  if (!target) return null;

  const result = recommendJejuCourses(JEJU_COURSES, target, { here, area });

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card tone="accent">
        <AppText bold>지금 수준: {LEVEL_LABEL[target.level]} 코스까지</AppText>
        <AppText variant="caption">
          {target.km !== null
            ? `오늘 운동은 걷기 포함 약 ${kmText(target.km)}km예요. 코스마다 오늘 달리는 방법을 알려 드려요.`
            : '오늘은 쉬는 날이에요. 다음 러닝 때 참고해 보세요.'}
          {target.avoidRough ? ' 오늘은 언덕·흙길 코스를 빼고 골랐어요.' : ''}
        </AppText>
      </Card>

      {result.usedLocation ? (
        <AppText variant="caption">지금 위치에서 가까운 순서예요.</AppText>
      ) : (
        <>
          <BigButton
            label={locating ? '위치 찾는 중…' : '내 위치로 가까운 순서 보기'}
            variant="outline"
            disabled={locating}
            onPress={locate}
          />
          {locateFailed ? (
            <AppText variant="caption">위치를 알 수 없어서 지역별로 보여 드려요. 아래에서 지역을 골라 보세요.</AppText>
          ) : here ? (
            <AppText variant="caption">지금 제주 밖에 계셔서 오늘 거리에 맞는 순서로 보여 드려요.</AppText>
          ) : null}
        </>
      )}

      <View style={styles.areas}>
        {AREAS.map((a) => (
          <View key={a ?? 'all'} style={styles.areaItem}>
            <ChoiceButton compact label={a ? AREA_LABEL[a] : '전체'} selected={area === a} onPress={() => setArea(a)} />
          </View>
        ))}
      </View>

      <Card>
        <AppText variant="title">추천 코스 ({result.picks.length}곳)</AppText>
        {result.picks.length === 0 ? (
          <AppText variant="caption">이 지역에는 오늘 맞는 코스가 없어요. 다른 지역을 골라 보세요.</AppText>
        ) : (
          result.picks.map((p) => <JejuCourseItem key={p.course.id} pick={p} course={p.course} />)
        )}
      </Card>

      {result.others.length > 0 && (
        <Card>
          <AppText variant="title">다른 코스</AppText>
          {result.others.map((o) => (
            <JejuCourseItem key={o.course.id} course={o.course} note={SKIP_TEXT[o.why]} />
          ))}
        </Card>
      )}

      <AppText variant="caption">{JEJU_NOTICE}</AppText>
      <Disclaimer />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  areas: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  areaItem: {
    minWidth: 96,
  },
});

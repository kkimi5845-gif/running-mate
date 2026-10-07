import { router } from 'expo-router';

import { AppText } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { Card } from '@/components/Card';
import { JejuCourseItem } from '@/components/JejuCourseItem';
import { kmText, type JejuPick } from '@/engine/jeju';

type Props = {
  pick: JejuPick | null;
  targetKm: number | null;
};

/** 홈: 오늘 수준에 맞는 제주 코스 한 곳 + 전체 목록 버튼 */
export function JejuCourseCard({ pick, targetKm }: Props) {
  return (
    <Card>
      <AppText variant="title">제주 추천 코스</AppText>
      {targetKm !== null ? <AppText variant="caption">오늘 운동은 걷기 포함 약 {kmText(targetKm)}km예요.</AppText> : null}
      {pick ? (
        <JejuCourseItem pick={pick} course={pick.course} />
      ) : (
        <AppText variant="caption">오늘 조건에 맞는 코스를 찾지 못했어요. 전체 목록에서 골라 보세요.</AppText>
      )}
      <BigButton label="제주 코스 더 보기" variant="outline" onPress={() => router.push('/jeju')} />
    </Card>
  );
}

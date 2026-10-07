import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { colors } from '@/theme';

const TIPS = [
  '가볍게 20~30분 산책해도 좋아요',
  '종아리·허벅지를 천천히 늘려 주세요',
  '물을 자주 마시고 푹 자요',
  '다음 러닝에 신을 신발과 옷을 미리 챙겨 두세요',
];

/** 쉬는 날 카드: 이유는 러닝메이트가 말했으니, 여기서는 쉬는 날 할 일만 */
export function RestDayCard() {
  return (
    <Card tone="accent">
      <AppText variant="caption" bold>
        오늘의 추천
      </AppText>
      <AppText variant="heading">오늘은 쉬어요</AppText>
      <AppText bold>쉬는 날 이렇게 보내 보세요</AppText>
      {TIPS.map((t) => (
        <AppText key={t} color={colors.text}>
          • {t}
        </AppText>
      ))}
    </Card>
  );
}

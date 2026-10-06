import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';

/** 홈 (오늘의 추천) — 5·6단계에서 추천 엔진과 러닝메이트 말풍선이 들어온다. */
export default function HomeScreen() {
  return (
    <Screen title="오늘의 러닝" subtitle="러닝메이트가 오늘 달릴지, 쉴지 알려드려요">
      <Card tone="accent">
        <AppText variant="title">안녕하세요! 👟</AppText>
        <AppText>곧 이곳에서 러닝메이트가 오늘의 추천을 알려드릴게요.</AppText>
      </Card>
    </Screen>
  );
}

import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';

/** 신발 마일리지 — 4단계에서 등록·누적 거리가 들어온다. */
export default function ShoesScreen() {
  return (
    <Screen title="신발" subtitle="신발별로 달린 거리를 모아서 보여드려요">
      <Card>
        <AppText variant="title">등록된 신발이 없어요</AppText>
        <AppText variant="caption">신발 등록 기능은 다음 단계에서 추가됩니다.</AppText>
      </Card>
    </Screen>
  );
}

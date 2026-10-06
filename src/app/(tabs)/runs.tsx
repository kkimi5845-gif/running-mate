import { AppText } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';

/** 기록 (러닝 시작·목록) — 3단계에서 GPS 기록이 들어온다. */
export default function RunsScreen() {
  return (
    <Screen title="기록" subtitle="러닝을 시작하고 지난 기록을 볼 수 있어요">
      <BigButton label="러닝 시작" disabled />
      <Card>
        <AppText variant="title">아직 기록이 없어요</AppText>
        <AppText variant="caption">GPS 기록 기능은 다음 단계에서 추가됩니다.</AppText>
      </Card>
    </Screen>
  );
}

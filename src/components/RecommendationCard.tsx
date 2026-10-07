import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { INTENSITY_LABEL, REASON_TEXT, segmentLabel } from '@/engine/rules';
import type { Recommendation } from '@/engine/types';
import { colors, radius, spacing } from '@/theme';

type Props = {
  rec: Recommendation;
  sessionsPerWeek: number;
};

/** 추천 엔진 결과를 그대로 보여주는 카드 (말투 없이 내용만) */
export function RecommendationCard({ rec, sessionsPerWeek }: Props) {
  const reasons = rec.reasons.map((code) => REASON_TEXT[code]({ sessionsPerWeek }));

  if (rec.rest || !rec.workout) {
    return (
      <Card tone="accent">
        <AppText variant="caption" bold>
          오늘의 추천
        </AppText>
        <AppText variant="heading">오늘은 쉬어요</AppText>
        <Reasons items={reasons} />
      </Card>
    );
  }

  const w = rec.workout;
  const intensity = INTENSITY_LABEL[rec.intensity];
  const setLabel = w.main.map(segmentLabel).join(' + ');

  return (
    <Card tone="accent">
      <AppText variant="caption" bold>
        오늘의 추천
      </AppText>
      <AppText variant="heading">총 {rec.totalMinutes}분</AppText>

      <View style={styles.intensity}>
        <Ionicons name="speedometer" size={22} color={colors.primary} />
        <View style={styles.flex}>
          <AppText bold>강도: {intensity.title}</AppText>
          <AppText variant="caption">{intensity.hint}</AppText>
        </View>
      </View>

      <View style={styles.steps}>
        <Step n={1} text={`준비 걷기 ${w.warmupMin}분`} />
        <Step n={2} text={w.repeat > 1 ? `${setLabel} × ${w.repeat}세트` : setLabel} strong />
        <Step n={3} text={`마무리 걷기 ${w.cooldownMin}분`} />
      </View>

      <Reasons items={reasons} />
    </Card>
  );
}

function Step({ n, text, strong }: { n: number; text: string; strong?: boolean }) {
  return (
    <View style={styles.step}>
      <View style={[styles.num, strong && styles.numStrong]}>
        <AppText bold color={strong ? colors.textOnPrimary : colors.text}>
          {n}
        </AppText>
      </View>
      <AppText variant={strong ? 'bodyLarge' : 'body'} bold={strong} style={styles.flex}>
        {text}
      </AppText>
    </View>
  );
}

function Reasons({ items }: { items: string[] }) {
  return (
    <View style={styles.reasons}>
      <AppText variant="caption" bold>
        이렇게 추천한 이유
      </AppText>
      {items.map((t) => (
        <AppText key={t} variant="caption" style={styles.reason}>
          • {t}
        </AppText>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  intensity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.background,
  },
  steps: {
    gap: spacing.sm,
    marginVertical: spacing.sm,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  num: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  numStrong: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  reasons: {
    gap: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  reason: {
    color: colors.text,
  },
});

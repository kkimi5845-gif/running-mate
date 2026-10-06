import { useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { ChoiceButton } from '@/components/ChoiceButton';
import {
  CONTINUOUS_RUN,
  DISCOMFORT_AREAS,
  EXPERIENCE,
  GOAL,
  MINUTES_PER_SESSION,
  SESSIONS_PER_WEEK,
  type DiscomfortArea,
  type Profile,
} from '@/profile/options';
import { colors, spacing } from '@/theme';

type Draft = Partial<Profile>;

type Props = {
  initial?: Profile | null;
  finishLabel: string;
  saving?: boolean;
  onFinish: (profile: Profile) => void;
  onCancel?: () => void;
};

const TOTAL_STEPS = 5;

/** 질문을 한 화면에 하나씩 보여준다. 온보딩(처음)과 프로필 수정에서 함께 쓴다. */
export function ProfileWizard({ initial, finishLabel, saving, onFinish, onCancel }: Props) {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(initial ?? { discomfortAreas: [] });

  const set = (patch: Draft) => setDraft((d) => ({ ...d, ...patch }));

  const answered = [
    draft.experience !== undefined,
    draft.continuousRun !== undefined,
    draft.goal !== undefined,
    draft.sessionsPerWeek !== undefined && draft.minutesPerSession !== undefined,
    draft.hasDiscomfort !== undefined,
  ][step];

  const isLast = step === TOTAL_STEPS - 1;

  const next = () => {
    if (!isLast) {
      setStep(step + 1);
      return;
    }
    onFinish({
      experience: draft.experience!,
      continuousRun: draft.continuousRun!,
      goal: draft.goal!,
      sessionsPerWeek: draft.sessionsPerWeek!,
      minutesPerSession: draft.minutesPerSession!,
      hasDiscomfort: draft.hasDiscomfort!,
      discomfortAreas: draft.hasDiscomfort ? (draft.discomfortAreas ?? []) : [],
    });
  };

  const toggleArea = (area: DiscomfortArea) => {
    const current = draft.discomfortAreas ?? [];
    set({
      discomfortAreas: current.includes(area)
        ? current.filter((a) => a !== area)
        : [...current, area],
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.progressArea}>
        <AppText variant="caption" bold>
          {step + 1} / {TOTAL_STEPS}
        </AppText>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${((step + 1) / TOTAL_STEPS) * 100}%` }]} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {step === 0 && (
          <Question title="러닝을 해 본 적이 있나요?">
            {EXPERIENCE.map((c) => (
              <ChoiceButton
                key={c.value}
                label={c.label}
                selected={draft.experience === c.value}
                onPress={() => set({ experience: c.value })}
              />
            ))}
          </Question>
        )}

        {step === 1 && (
          <Question title="지금 쉬지 않고 얼마나 달릴 수 있나요?" hint="걷지 않고 천천히 달리는 기준이에요.">
            {CONTINUOUS_RUN.map((c) => (
              <ChoiceButton
                key={c.value}
                label={c.label}
                selected={draft.continuousRun === c.value}
                onPress={() => set({ continuousRun: c.value })}
              />
            ))}
          </Question>
        )}

        {step === 2 && (
          <Question title="어떤 목표로 달리고 싶나요?">
            {GOAL.map((c) => (
              <ChoiceButton
                key={c.value}
                label={c.label}
                selected={draft.goal === c.value}
                onPress={() => set({ goal: c.value })}
              />
            ))}
          </Question>
        )}

        {step === 3 && (
          <>
            <Question title="일주일에 몇 번 달릴 수 있나요?">
              <View style={styles.grid}>
                {SESSIONS_PER_WEEK.map((c) => (
                  <ChoiceButton
                    key={c.value}
                    compact
                    label={c.label}
                    selected={draft.sessionsPerWeek === c.value}
                    onPress={() => set({ sessionsPerWeek: c.value })}
                  />
                ))}
              </View>
            </Question>
            <Question title="한 번에 얼마나 시간을 낼 수 있나요?">
              {MINUTES_PER_SESSION.map((c) => (
                <ChoiceButton
                  key={c.value}
                  label={c.label}
                  selected={draft.minutesPerSession === c.value}
                  onPress={() => set({ minutesPerSession: c.value })}
                />
              ))}
            </Question>
          </>
        )}

        {step === 4 && (
          <>
            <Question
              title="무릎·발목·허리 등 지금 불편한 곳이 있나요?"
              hint="달리기 강도를 정할 때 참고해요.">
              <ChoiceButton
                label="없어요"
                selected={draft.hasDiscomfort === false}
                onPress={() => set({ hasDiscomfort: false })}
              />
              <ChoiceButton
                label="있어요"
                selected={draft.hasDiscomfort === true}
                onPress={() => set({ hasDiscomfort: true })}
              />
            </Question>
            {draft.hasDiscomfort && (
              <Question title="어느 부위인가요?" hint="여러 개 고를 수 있어요. 고르지 않아도 괜찮아요.">
                {DISCOMFORT_AREAS.map((c) => (
                  <ChoiceButton
                    key={c.value}
                    multiple
                    label={c.label}
                    selected={(draft.discomfortAreas ?? []).includes(c.value)}
                    onPress={() => toggleArea(c.value)}
                  />
                ))}
              </Question>
            )}
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.footerButton}>
          {step > 0 ? (
            <BigButton label="이전" variant="outline" onPress={() => setStep(step - 1)} />
          ) : onCancel ? (
            <BigButton label="취소" variant="outline" onPress={onCancel} />
          ) : null}
        </View>
        <View style={styles.footerButton}>
          <BigButton
            label={isLast ? finishLabel : '다음'}
            disabled={!answered || saving}
            onPress={next}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

function Question({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.question}>
      <View style={styles.questionHeader}>
        <AppText variant="heading" accessibilityRole="header">
          {title}
        </AppText>
        {hint ? <AppText variant="caption">{hint}</AppText> : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  progressArea: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.xl,
  },
  question: {
    gap: spacing.md,
  },
  questionHeader: {
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerButton: {
    flex: 1,
  },
});

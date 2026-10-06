import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { colors, radius, spacing } from '@/theme';

type Props = {
  children: ReactNode;
  tone?: 'default' | 'accent';
  style?: ViewStyle;
};

/** 그림자 없는 깔끔한 카드. tone="accent"는 포인트 색을 옅게 깐 강조 카드. */
export function Card({ children, tone = 'default', style }: Props) {
  return <View style={[styles.card, tone === 'accent' && styles.accent, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  accent: {
    backgroundColor: colors.primarySoft,
  },
});

import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { colors, radius, spacing } from '@/theme';

/** 홈 맨 위 "오늘의 한 줄". 누르면 다른 문장 */
export function DailyLineCard({ line, onNext }: { line: string; onNext: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint="눌러서 다른 문장 보기"
      onPress={onNext}
      style={({ pressed }) => [styles.box, pressed && styles.pressed]}>
      <View style={styles.head}>
        <AppText variant="caption" bold color={colors.primary}>
          오늘의 한 줄
        </AppText>
        <Ionicons name="refresh" size={18} color={colors.textSecondary} accessibilityLabel="다른 문장" />
      </View>
      <AppText variant="bodyLarge" bold>
        “{line}”
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    gap: spacing.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    borderLeftWidth: 5,
    borderLeftColor: colors.primary,
    backgroundColor: colors.surface,
  },
  pressed: {
    opacity: 0.8,
  },
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});

import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet } from 'react-native';

import { AppText } from '@/components/AppText';
import { colors, radius, spacing, touchHeight } from '@/theme';

type Props = {
  label: string;
  selected: boolean;
  onPress: () => void;
  /** 여러 개 고를 수 있으면 체크박스 모양, 하나만 고르면 동그라미 모양 */
  multiple?: boolean;
  compact?: boolean;
};

/** 온보딩·설정에서 쓰는 큰 선택 버튼 */
export function ChoiceButton({ label, selected, onPress, multiple, compact }: Props) {
  const icon = multiple
    ? selected
      ? 'checkbox'
      : 'square-outline'
    : selected
      ? 'radio-button-on'
      : 'radio-button-off';

  return (
    <Pressable
      accessibilityRole={multiple ? 'checkbox' : 'radio'}
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        compact && styles.compact,
        selected && styles.selected,
        pressed && !selected && styles.pressed,
      ]}>
      {!compact && (
        <Ionicons name={icon} size={26} color={selected ? colors.primary : colors.textSecondary} />
      )}
      <AppText variant="bodyLarge" bold={selected} color={selected ? colors.primary : colors.text}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: touchHeight + 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  compact: {
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    minWidth: 64,
  },
  selected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  pressed: {
    backgroundColor: colors.surface,
  },
});

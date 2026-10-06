import { StyleSheet, TextInput, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { colors, fontSize, radius, spacing, touchHeight } from '@/theme';

type Props = {
  label: string;
  unit: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string | null;
  placeholder?: string;
};

/** 숫자 입력칸: 왼쪽 이름, 오른쪽 큰 입력칸 + 단위 */
export function NumberField({ label, unit, value, onChangeText, error, placeholder }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <AppText variant="bodyLarge" bold style={styles.label}>
          {label}
        </AppText>
        <TextInput
          accessibilityLabel={`${label} (${unit})`}
          value={value}
          onChangeText={onChangeText}
          keyboardType="decimal-pad"
          placeholder={placeholder ?? '선택 입력'}
          placeholderTextColor={colors.textSecondary}
          style={[styles.input, error ? styles.inputError : null]}
          maxLength={6}
        />
        <AppText variant="bodyLarge" style={styles.unit}>
          {unit}
        </AppText>
      </View>
      {error ? <AppText color={colors.danger}>{error}</AppText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  label: {
    width: 92,
  },
  input: {
    flex: 1,
    minHeight: touchHeight,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: fontSize.title,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'right',
  },
  inputError: {
    borderColor: colors.danger,
  },
  unit: {
    width: 36,
  },
});

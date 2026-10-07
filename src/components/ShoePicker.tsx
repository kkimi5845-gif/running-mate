import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { ShoeStatusTag, ShoeThumb } from '@/components/ShoeBadge';
import type { Shoe } from '@/db/shoes';
import { colors, radius, spacing, touchHeight } from '@/theme';

type Props = {
  shoes: Shoe[]; // 보관하지 않은 신발만 넘긴다
  selectedId: number | null;
  onSelect: (shoeId: number | null) => void;
};

/** 오늘 신을 신발 고르기 — 터치 한 번으로 선택 */
export function ShoePicker({ shoes, selectedId, onSelect }: Props) {
  return (
    <View style={styles.list} accessibilityRole="radiogroup">
      {shoes.map((s) => (
        <Option key={s.id} selected={selectedId === s.id} onPress={() => onSelect(s.id)}>
          <ShoeThumb uri={s.photoUri} size={44} />
          <View style={styles.main}>
            <AppText bold numberOfLines={1}>
              {s.name}
            </AppText>
            <AppText variant="caption">누적 {Math.round(s.totalKm)}km</AppText>
          </View>
          {s.status !== 'ok' && <ShoeStatusTag status={s.status} />}
        </Option>
      ))}
      <Option selected={selectedId === null} onPress={() => onSelect(null)}>
        <View style={styles.main}>
          <AppText>신발 선택 안 함</AppText>
        </View>
      </Option>
    </View>
  );
}

function Option({
  selected,
  onPress,
  children,
}: {
  selected: boolean;
  onPress: () => void;
  children: ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={[styles.option, selected && styles.selected]}>
      <Ionicons
        name={selected ? 'radio-button-on' : 'radio-button-off'}
        size={26}
        color={selected ? colors.primary : colors.textSecondary}
      />
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.sm,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: touchHeight + 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  selected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  main: {
    flex: 1,
    gap: 2,
  },
});

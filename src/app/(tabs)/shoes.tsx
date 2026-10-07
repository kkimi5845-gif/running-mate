import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { Card } from '@/components/Card';
import { Screen } from '@/components/Screen';
import { ShoeStatusTag, ShoeThumb, WearBar } from '@/components/ShoeBadge';
import { listShoes, type Shoe } from '@/db/shoes';
import { statusMessage, wearRatio } from '@/shoes/status';
import { colors, radius, spacing } from '@/theme';

/** 신발 탭: 신발별 누적 거리·사용 횟수·교체 시점 */
export default function ShoesScreen() {
  const db = useSQLiteContext();
  const [shoes, setShoes] = useState<Shoe[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      listShoes(db).then(setShoes);
    }, [db]),
  );

  const active = shoes?.filter((s) => !s.retired) ?? [];
  const retired = shoes?.filter((s) => s.retired) ?? [];

  return (
    <Screen title="신발" subtitle="신발별로 달린 거리를 모아서 보여드려요">
      <BigButton label="+ 신발 등록" onPress={() => router.push('/shoe/edit')} />

      {shoes && shoes.length === 0 && (
        <Card>
          <AppText variant="title">등록된 신발이 없어요</AppText>
          <AppText>
            신발을 등록하고 러닝을 시작할 때 고르면, 달린 거리가 신발에 자동으로 쌓여요. 권장 거리의 80%가 되면
            &quot;교체 준비&quot;, 다 채우면 &quot;교체 권장&quot;을 알려 드려요.
          </AppText>
        </Card>
      )}

      {active.map((s) => (
        <ShoeRow key={s.id} shoe={s} />
      ))}

      {retired.length > 0 && (
        <>
          <AppText variant="title" accessibilityRole="header" style={styles.section}>
            보관한 신발
          </AppText>
          {retired.map((s) => (
            <ShoeRow key={s.id} shoe={s} />
          ))}
        </>
      )}
    </Screen>
  );
}

function ShoeRow({ shoe }: { shoe: Shoe }) {
  const message = shoe.retired ? null : statusMessage(shoe.status, shoe.replaceKm - shoe.totalKm);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint="눌러서 수정"
      onPress={() => router.push({ pathname: '/shoe/edit', params: { id: String(shoe.id) } })}
      style={({ pressed }) => [styles.row, shoe.retired && styles.rowRetired, pressed && styles.rowPressed]}>
      <View style={styles.rowTop}>
        <ShoeThumb uri={shoe.photoUri} />
        <View style={styles.rowMain}>
          <AppText variant="bodyLarge" bold numberOfLines={2}>
            {shoe.name}
          </AppText>
          {shoe.retired ? (
            <AppText variant="caption">보관 중</AppText>
          ) : (
            <ShoeStatusTag status={shoe.status} />
          )}
        </View>
        <Ionicons name="chevron-forward" size={24} color={colors.textSecondary} />
      </View>

      <View style={styles.numbers}>
        <AppText variant="title">
          {Math.round(shoe.totalKm)}
          <AppText variant="caption"> / {shoe.replaceKm}km</AppText>
        </AppText>
        <AppText variant="caption">러닝 {shoe.runCount}회</AppText>
      </View>
      <WearBar ratio={wearRatio(shoe.totalKm, shoe.replaceKm)} status={shoe.status} />
      {message && (
        <AppText bold color={shoe.status === 'replace' ? colors.danger : colors.warning}>
          {message}
        </AppText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: spacing.md,
  },
  row: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  rowRetired: {
    backgroundColor: colors.surface,
  },
  rowPressed: {
    backgroundColor: colors.surface,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rowMain: {
    flex: 1,
    gap: spacing.xs,
  },
  numbers: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
});

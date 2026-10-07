import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { STATUS_LABEL, type ShoeStatus } from '@/shoes/status';
import { colors, radius, spacing } from '@/theme';

const STATUS_STYLE: Record<ShoeStatus, { color: string; icon: 'checkmark-circle' | 'alert-circle' | 'warning' }> = {
  ok: { color: colors.success, icon: 'checkmark-circle' },
  ready: { color: colors.warning, icon: 'alert-circle' },
  replace: { color: colors.danger, icon: 'warning' },
};

/** 신발 상태 표시: 색만으로 구분하지 않도록 아이콘과 글자를 함께 쓴다 */
export function ShoeStatusTag({ status }: { status: ShoeStatus }) {
  const s = STATUS_STYLE[status];
  return (
    <View style={styles.tag}>
      <Ionicons name={s.icon} size={20} color={s.color} />
      <AppText variant="caption" bold color={s.color}>
        {STATUS_LABEL[status]}
      </AppText>
    </View>
  );
}

export function statusColor(status: ShoeStatus): string {
  return STATUS_STYLE[status].color;
}

/** 신발 사진 (없으면 신발 아이콘) */
export function ShoeThumb({ uri, size = 56 }: { uri: string | null; size?: number }) {
  if (uri) {
    return <Image source={{ uri }} style={[styles.thumb, { width: size, height: size }]} contentFit="cover" />;
  }
  return (
    <View style={[styles.thumb, styles.placeholder, { width: size, height: size }]}>
      <Ionicons name="footsteps" size={size * 0.5} color={colors.textSecondary} />
    </View>
  );
}

/** 누적 거리 막대 */
export function WearBar({ ratio, status }: { ratio: number; status: ShoeStatus }) {
  return (
    <View style={styles.track} accessibilityRole="progressbar" accessibilityValue={{ now: Math.round(ratio * 100), min: 0, max: 100 }}>
      <View style={[styles.fill, { width: `${ratio * 100}%`, backgroundColor: statusColor(status) }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  thumb: {
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  track: {
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 5,
  },
});

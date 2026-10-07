import Ionicons from '@expo/vector-icons/Ionicons';
import { Alert, Linking, Platform, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import type { JejuPick } from '@/engine/jeju';
import { kmText } from '@/engine/jeju';
import { AREA_LABEL, LEVEL_LABEL, type JejuCourse } from '@/jeju/courses';
import { colors, radius, spacing } from '@/theme';

const SHAPE_LABEL: Record<JejuCourse['shape'], string> = {
  loop: '한 바퀴',
  track: '트랙 한 바퀴',
  line: '편도',
};

/** 지도 앱에서 코스 출발 지점 열기 (코스 좌표만 넘기고 내 위치는 넘기지 않는다) */
function openMap(c: JejuCourse) {
  const label = encodeURIComponent(c.name);
  const url =
    Platform.OS === 'ios'
      ? `https://maps.apple.com/?ll=${c.lat},${c.lng}&q=${label}`
      : `geo:${c.lat},${c.lng}?q=${c.lat},${c.lng}(${label})`;
  Linking.openURL(url).catch(() => Alert.alert('지도를 열지 못했어요', '휴대폰에 지도 앱이 있는지 확인해 주세요.'));
}

type Props = {
  pick?: JejuPick;
  course: JejuCourse;
  /** 목록에서 뺀 이유 (다른 코스 목록에서만) */
  note?: string;
};

/** 제주 코스 한 개: 이름, 수준·지역·거리, 오늘 달리는 방법, 지도 버튼 */
export function JejuCourseItem({ pick, course: c, note }: Props) {
  return (
    <View style={styles.box}>
      <AppText variant="bodyLarge" bold>
        {c.name}
      </AppText>
      <View style={styles.tags}>
        <Tag text={LEVEL_LABEL[c.level]} strong={pick?.exactLevel} />
        <Tag text={AREA_LABEL[c.area]} />
        <Tag text={`${SHAPE_LABEL[c.shape]} 약 ${kmText(c.km)}km`} />
      </View>
      <AppText variant="caption">
        {c.feature}
        {c.rough ? ` · ⚠️ ${c.rough}` : ''}
      </AppText>
      {pick?.how ? <AppText bold>오늘은: {pick.how}</AppText> : null}
      {pick?.awayKm != null ? <AppText variant="caption">지금 위치에서 직선으로 약 {kmText(pick.awayKm)}km</AppText> : null}
      {note ? <AppText variant="caption">{note}</AppText> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${c.name} 지도에서 보기`}
        onPress={() => openMap(c)}
        style={({ pressed }) => [styles.mapBtn, pressed && styles.pressed]}>
        <Ionicons name="map-outline" size={22} color={colors.primary} />
        <AppText bold color={colors.primary}>
          지도에서 보기
        </AppText>
      </Pressable>
    </View>
  );
}

function Tag({ text, strong }: { text: string; strong?: boolean }) {
  return (
    <View style={[styles.tag, strong && styles.tagStrong]}>
      <AppText variant="caption" bold color={strong ? colors.textOnPrimary : colors.text}>
        {text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.background,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  tag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagStrong: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  mapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 44,
    alignSelf: 'flex-start',
  },
  pressed: {
    opacity: 0.6,
  },
});

import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { RouteMap } from '@/components/RouteMap';
import type { CourseSuggestion } from '@/engine/course';
import { formatDuration, formatKm } from '@/location/format';
import { colors } from '@/theme';
import { formatRunTitle } from '@/utils/date';

type Props = {
  course: CourseSuggestion | null;
  points: { latitude: number; longitude: number }[];
  hasHistory: boolean;
};

/** 나에게 맞는 코스: 내가 달렸던 코스 중 오늘 추천 시간과 비슷한 것 */
export function CourseCard({ course, points, hasHistory }: Props) {
  return (
    <Card>
      <AppText variant="title">오늘의 코스</AppText>
      {course ? (
        <>
          <AppText variant="caption">{formatRunTitle(course.startedAt).replace(/ 러닝$/, '')}에 달린 코스</AppText>
          <RouteMap points={points} height={200} />
          <View style={styles.row}>
            <AppText bold>{formatKm(course.distanceM)} km</AppText>
            <AppText>그때 걸린 시간 {formatDuration(course.durationSec)}</AppText>
          </View>
          <AppText variant="caption">오늘 추천 시간과 비슷하게 걸렸던 코스예요. 익숙한 길이라 편하게 달릴 수 있어요.</AppText>
        </>
      ) : (
        <AppText variant="caption" style={styles.empty}>
          {hasHistory
            ? '오늘 추천 시간과 비슷한 지난 코스가 아직 없어요. 오늘 달린 길이 다음 추천 코스가 될 수 있어요.'
            : '러닝 기록이 쌓이면, 오늘 추천 시간에 맞는 지난 코스를 골라 드릴게요.'}
        </AppText>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  empty: {
    color: colors.text,
  },
});

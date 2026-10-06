import { useState } from 'react';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';

import { AppText } from '@/components/AppText';
import { colors, spacing } from '@/theme';
import { formatDateLong, formatDateShort } from '@/utils/date';

export type ChartPoint = { date: string; value: number };

type Props = {
  points: ChartPoint[]; // 오래된 날짜 → 최근 날짜 순
  unit: string;
};

const HEIGHT = 180;
const PAD = { top: 16, bottom: 16, left: 12, right: 12 };
const HIT = 44; // 손가락으로 누르기 쉬운 점 터치 영역

/**
 * 한 가지 수치의 변화를 보여주는 단순한 선 그래프.
 * 점을 누르면 그날의 값이 위에 크게 표시된다. 기본은 가장 최근 값.
 */
export function MetricChart({ points, unit }: Props) {
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  if (points.length === 0) {
    return <AppText variant="caption">아직 이 항목을 입력한 기록이 없어요.</AppText>;
  }

  const active = points[selected ?? points.length - 1];

  const values = points.map((p) => p.value);
  let min = Math.min(...values);
  let max = Math.max(...values);
  if (max - min < 1) {
    // 값이 거의 같으면 위아래 여유를 줘서 선이 가운데 오게 한다
    min -= 1;
    max += 1;
  }

  const plotW = Math.max(width - PAD.left - PAD.right, 1);
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const x = (i: number) =>
    PAD.left + (points.length === 1 ? plotW / 2 : (i / (points.length - 1)) * plotW);
  const y = (v: number) => PAD.top + (1 - (v - min) / (max - min)) * plotH;

  const fmt = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));

  return (
    <View style={styles.wrap}>
      <View>
        <AppText variant="number">
          {fmt(active.value)}
          <AppText variant="title"> {unit}</AppText>
        </AppText>
        <AppText variant="caption">{formatDateLong(active.date)}</AppText>
      </View>

      <View style={{ height: HEIGHT }} onLayout={onLayout}>
        {width > 0 && (
          <Svg width={width} height={HEIGHT}>
            {/* 가로 보조선: 최고값·최저값 위치 (흐리게) */}
            <Line x1={PAD.left} x2={width - PAD.right} y1={PAD.top} y2={PAD.top} stroke={colors.border} strokeWidth={1} />
            <Line x1={PAD.left} x2={width - PAD.right} y1={HEIGHT - PAD.bottom} y2={HEIGHT - PAD.bottom} stroke={colors.border} strokeWidth={1} />
            {points.length > 1 && (
              <Polyline
                points={points.map((p, i) => `${x(i)},${y(p.value)}`).join(' ')}
                fill="none"
                stroke={colors.primary}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            )}
            {points.map((p, i) => {
              const isActive = p === active;
              return (
                <Circle
                  key={`${p.date}-${i}`}
                  cx={x(i)}
                  cy={y(p.value)}
                  r={isActive ? 7 : 4.5}
                  fill={isActive ? colors.primary : colors.background}
                  stroke={colors.primary}
                  strokeWidth={2}
                />
              );
            })}
          </Svg>
        )}
        {/* 점보다 넓은 투명 터치 영역 */}
        {width > 0 &&
          points.map((p, i) => (
            <Pressable
              key={`hit-${p.date}-${i}`}
              accessibilityRole="button"
              accessibilityLabel={`${formatDateLong(p.date)} ${fmt(p.value)}${unit}`}
              onPress={() => setSelected(i)}
              style={[styles.hit, { left: x(i) - HIT / 2, top: y(p.value) - HIT / 2 }]}
            />
          ))}
      </View>

      <View style={styles.axis}>
        <AppText variant="caption">{formatDateShort(points[0].date)}</AppText>
        <AppText variant="caption">
          {points.length > 1 ? `점을 누르면 그날 값이 보여요 · ${formatDateShort(points[points.length - 1].date)}` : ''}
        </AppText>
      </View>
      <AppText variant="caption">
        최저 {fmt(Math.min(...values))}
        {unit} · 최고 {fmt(Math.max(...values))}
        {unit}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  hit: {
    position: 'absolute',
    width: HIT,
    height: HIT,
  },
  axis: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});

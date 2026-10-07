import Constants from 'expo-constants';
import { useRef, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import Svg, { Circle, Polyline as SvgPolyline } from 'react-native-svg';

import { AppText } from '@/components/AppText';
import { colors, radius } from '@/theme';

type LatLng = { latitude: number; longitude: number };

type Props = {
  points: LatLng[];
  height?: number;
};

/**
 * 안드로이드 지도(구글 지도)는 구글 지도 API 키가 있어야 제대로 그려진다.
 * (키 없이 쓰면 Expo Go에서도 검은 화면만 나왔다.)
 * 키를 설정하고 app.json의 extra.hasGoogleMapsKey를 true로 바꾸기 전까지는
 * 배경 지도 없이 경로 모양만 그려서 보여준다. 인터넷 없이도 보인다.
 */
const canUseMap = Constants.expoConfig?.extra?.hasGoogleMapsKey === true;

/** 러닝 경로 표시 */
export function RouteMap({ points, height = 280 }: Props) {
  if (points.length < 2) {
    return (
      <View style={[styles.box, styles.empty, { height: 120 }]}>
        <AppText variant="caption">표시할 경로가 없어요.</AppText>
      </View>
    );
  }
  return canUseMap ? <GoogleRoute points={points} height={height} /> : <ShapeRoute points={points} height={height} />;
}

function GoogleRoute({ points, height }: { points: LatLng[]; height: number }) {
  const ref = useRef<MapView>(null);
  return (
    <View style={[styles.box, { height }]}>
      <MapView
        ref={ref}
        style={StyleSheet.absoluteFill}
        toolbarEnabled={false}
        onMapReady={() =>
          ref.current?.fitToCoordinates(points, {
            edgePadding: { top: 40, right: 40, bottom: 40, left: 40 },
            animated: false,
          })
        }>
        <Polyline coordinates={points} strokeColor={colors.primary} strokeWidth={5} />
        <Marker coordinate={points[0]} title="출발" pinColor="green" />
        <Marker coordinate={points[points.length - 1]} title="도착" pinColor="red" />
      </MapView>
    </View>
  );
}

/** 배경 지도 없이 경로 모양만 그린다 (위도·경도를 화면 좌표로 단순 변환) */
function ShapeRoute({ points, height }: { points: LatLng[]; height: number }) {
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const pad = 24;
  const lats = points.map((p) => p.latitude);
  const lngs = points.map((p) => p.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  // 경도 1도의 실제 길이는 위도에 따라 줄어든다
  const lngScale = Math.cos(((minLat + maxLat) / 2) * (Math.PI / 180));
  const spanX = Math.max((maxLng - minLng) * lngScale, 1e-9);
  const spanY = Math.max(maxLat - minLat, 1e-9);
  const scale = Math.min((width - pad * 2) / spanX, (height - pad * 2) / spanY);
  const offX = (width - spanX * scale) / 2;
  const offY = (height - spanY * scale) / 2;
  const toXY = (p: LatLng) => ({
    x: offX + (p.longitude - minLng) * lngScale * scale,
    y: offY + (maxLat - p.latitude) * scale,
  });

  const start = toXY(points[0]);
  const end = toXY(points[points.length - 1]);

  return (
    <View style={[styles.box, styles.shape, { height }]} onLayout={onLayout}>
      {width > 0 && (
        <Svg width={width} height={height}>
          <SvgPolyline
            points={points.map((p) => {
              const { x, y } = toXY(p);
              return `${x},${y}`;
            }).join(' ')}
            fill="none"
            stroke={colors.primary}
            strokeWidth={4}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <Circle cx={start.x} cy={start.y} r={8} fill={colors.success} stroke={colors.background} strokeWidth={2} />
          <Circle cx={end.x} cy={end.y} r={8} fill={colors.danger} stroke={colors.background} strokeWidth={2} />
        </Svg>
      )}
      <AppText variant="caption" style={styles.legend}>
        <AppText variant="caption" color={colors.success}>
          ●
        </AppText>{' '}
        출발 ·{' '}
        <AppText variant="caption" color={colors.danger}>
          ●
        </AppText>{' '}
        도착
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    width: '100%',
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  shape: {
    borderWidth: 1,
    borderColor: colors.border,
  },
  legend: {
    position: 'absolute',
    left: 12,
    bottom: 8,
  },
});

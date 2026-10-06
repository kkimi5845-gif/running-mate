/**
 * GPS 좌표 계산 (순수 함수 — 단위 테스트 대상)
 *
 * 원본 좌표는 모두 저장하고, 여기서 "거리 계산에 쓸지"만 판단한다.
 * - 정확도 오차가 큰 점은 제외한다.
 * - 바로 앞 점에서 사람이 달릴 수 없는 속도로 튄 점은 제외한다.
 */

export type GeoPoint = {
  t: number; // 밀리초 타임스탬프
  lat: number;
  lng: number;
  accuracy: number | null; // 오차 반경(m)
};

/** 정확도 오차가 이보다 크면 거리 계산에서 뺀다 (m) */
export const MAX_ACCURACY_M = 25;
/** 이보다 빠르게 이동한 것으로 계산되면 GPS가 튄 것으로 본다 (m/s, 약 1분 51초/km) */
export const MAX_SPEED_MPS = 9;

export type Exclusion = 'accuracy' | 'speed' | 'duplicate';

export type Evaluation =
  | { used: true; addMeters: number }
  | { used: false; addMeters: 0; reason: Exclusion };

const EARTH_RADIUS_M = 6_371_000;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/** 두 좌표 사이의 거리(m) — 하버사인 공식 */
export function distanceMeters(a: Pick<GeoPoint, 'lat' | 'lng'>, b: Pick<GeoPoint, 'lat' | 'lng'>): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * 새 좌표를 거리 계산에 쓸지 판단한다.
 * @param prevUsed 같은 구간(일시정지 이후)에서 마지막으로 거리 계산에 쓴 점. 없으면 null.
 */
export function evaluatePoint(prevUsed: GeoPoint | null, p: GeoPoint): Evaluation {
  if (p.accuracy === null || p.accuracy > MAX_ACCURACY_M) {
    return { used: false, addMeters: 0, reason: 'accuracy' };
  }
  if (!prevUsed) return { used: true, addMeters: 0 };

  const seconds = (p.t - prevUsed.t) / 1000;
  if (seconds <= 0) return { used: false, addMeters: 0, reason: 'duplicate' };

  const meters = distanceMeters(prevUsed, p);
  if (meters / seconds > MAX_SPEED_MPS) {
    return { used: false, addMeters: 0, reason: 'speed' };
  }
  return { used: true, addMeters: meters };
}

/** 여러 점을 순서대로 판단해 총 거리를 구한다 (기록 다시 계산·테스트용) */
export function totalDistance(points: GeoPoint[]): number {
  let prev: GeoPoint | null = null;
  let total = 0;
  for (const p of points) {
    const e = evaluatePoint(prev, p);
    if (e.used) {
      total += e.addMeters;
      prev = p;
    }
  }
  return total;
}

/** 현재 페이스를 계산할 최근 구간 길이 */
export const CURRENT_PACE_WINDOW_MS = 30_000;

/**
 * 최근 30초 동안 쓴 점들로 현재 페이스(초/km)를 구한다.
 * 움직임이 너무 적으면(20m 미만) null — 멈춰 있을 때 엉뚱한 숫자가 나오지 않게.
 */
export function currentPaceSecPerKm(recentUsed: GeoPoint[], now: number): number | null {
  const pts = recentUsed.filter((p) => now - p.t <= CURRENT_PACE_WINDOW_MS);
  if (pts.length < 2) return null;
  let meters = 0;
  for (let i = 1; i < pts.length; i++) meters += distanceMeters(pts[i - 1], pts[i]);
  const seconds = (pts[pts.length - 1].t - pts[0].t) / 1000;
  if (meters < 20 || seconds <= 0) return null;
  return seconds / (meters / 1000);
}

/** 평균 페이스(초/km). 100m도 안 달렸으면 null */
export function averagePaceSecPerKm(distanceM: number, durationSec: number): number | null {
  if (distanceM < 100 || durationSec <= 0) return null;
  return durationSec / (distanceM / 1000);
}

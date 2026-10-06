import {
  averagePaceSecPerKm,
  currentPaceSecPerKm,
  distanceMeters,
  evaluatePoint,
  totalDistance,
  type GeoPoint,
} from '../geo';

// 위도 1도 ≈ 111.2km. 0.0001도 ≈ 11.1m
const P = (t: number, lat: number, accuracy: number | null = 5): GeoPoint => ({
  t: t * 1000,
  lat,
  lng: 127,
  accuracy,
});

describe('distanceMeters', () => {
  it('위도 0.001도 차이는 약 111m', () => {
    expect(distanceMeters(P(0, 37.5), P(0, 37.501))).toBeCloseTo(111.2, 0);
  });
  it('같은 점은 0m', () => {
    expect(distanceMeters(P(0, 37.5), P(0, 37.5))).toBe(0);
  });
});

describe('evaluatePoint', () => {
  it('첫 점은 쓰되 거리는 0', () => {
    expect(evaluatePoint(null, P(0, 37.5))).toEqual({ used: true, addMeters: 0 });
  });
  it('정확도 오차가 크면 제외', () => {
    expect(evaluatePoint(null, P(0, 37.5, 50))).toMatchObject({ used: false, reason: 'accuracy' });
  });
  it('정확도 정보가 없으면 제외', () => {
    expect(evaluatePoint(null, P(0, 37.5, null))).toMatchObject({ used: false, reason: 'accuracy' });
  });
  it('1초에 5.6m(약 3분/km)는 정상', () => {
    const e = evaluatePoint(P(0, 37.5), P(1, 37.50005));
    expect(e.used).toBe(true);
    expect(e.addMeters).toBeCloseTo(5.6, 0);
  });
  it('1초에 11m(약 1분 30초/km)는 사람이 달릴 수 없는 속도라 제외', () => {
    expect(evaluatePoint(P(0, 37.5), P(1, 37.5001))).toMatchObject({ used: false, reason: 'speed' });
  });
  it('1초에 111m 점프는 제외', () => {
    expect(evaluatePoint(P(0, 37.5), P(1, 37.501))).toMatchObject({ used: false, reason: 'speed' });
  });
  it('같은 시각이거나 시간이 거꾸로면 제외', () => {
    expect(evaluatePoint(P(5, 37.5), P(5, 37.5001))).toMatchObject({ used: false, reason: 'duplicate' });
  });
});

describe('totalDistance', () => {
  it('튀는 점을 빼고, 다음 점은 마지막 정상 점과 비교', () => {
    const points = [
      P(0, 37.5),
      P(10, 37.5003), // +33m
      P(11, 37.51), // 1초에 1km 점프 → 제외
      P(20, 37.5006), // 마지막 정상 점(10초)에서 +33m
      P(30, 37.5009, 80), // 정확도 나쁨 → 제외
      P(40, 37.5012), // +67m (20초 전 점과 비교)
    ];
    expect(totalDistance(points)).toBeCloseTo(133.4, 0);
  });
});

describe('페이스', () => {
  it('30초 동안 100m → 300초/km(5분/km)', () => {
    const pts = [P(0, 37.5), P(10, 37.5003), P(20, 37.5006), P(30, 37.5009)];
    // 0.0009도 ≈ 100.1m
    expect(currentPaceSecPerKm(pts, 30_000)).toBeCloseTo(299.7, 0);
  });
  it('30초보다 오래된 점은 빼고 계산', () => {
    const pts = [P(0, 37.4), P(100, 37.5), P(110, 37.5003), P(120, 37.5006)];
    expect(currentPaceSecPerKm(pts, 120_000)).toBeCloseTo(299.7, 0);
  });
  it('거의 안 움직이면 null', () => {
    expect(currentPaceSecPerKm([P(0, 37.5), P(10, 37.50001)], 10_000)).toBeNull();
  });
  it('평균 페이스: 5km 30분 → 6분/km', () => {
    expect(averagePaceSecPerKm(5000, 1800)).toBe(360);
  });
  it('100m 미만이면 평균 페이스 없음', () => {
    expect(averagePaceSecPerKm(50, 60)).toBeNull();
  });
});

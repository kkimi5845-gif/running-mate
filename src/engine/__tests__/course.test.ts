import { recommendCourse, type CourseCandidate } from '../course';
import type { Recommendation } from '../types';

const rec = (totalMinutes: number, rest = false): Recommendation => ({
  rest,
  workout: rest ? null : { warmupMin: 5, main: [{ kind: 'run', minutes: totalMinutes - 10 }], repeat: 1, cooldownMin: 5 },
  totalMinutes: rest ? 0 : totalMinutes,
  intensity: 'easy',
  level: 6,
  reasons: [],
});

const c = (runId: number, minutes: number, extra: Partial<CourseCandidate> = {}): CourseCandidate => ({
  runId,
  startedAt: new Date(2026, 9, runId).toISOString(),
  distanceM: 3000,
  durationSec: minutes * 60,
  pointCount: 100,
  ...extra,
});

describe('recommendCourse', () => {
  it('시간이 가장 비슷한 코스를 고른다', () => {
    const s = recommendCourse(rec(30), [c(1, 20), c(2, 33), c(3, 45)]);
    expect(s?.runId).toBe(2);
  });

  it('차이가 같으면 최근 코스', () => {
    expect(recommendCourse(rec(30), [c(1, 27), c(5, 33)])?.runId).toBe(5);
  });

  it('±35%를 넘게 차이 나면 추천하지 않는다', () => {
    expect(recommendCourse(rec(30), [c(1, 10), c(2, 60)])).toBeNull();
  });

  it('짧은 시험 기록·경로 좌표가 적은 기록은 뺀다', () => {
    const list = [c(1, 30, { distanceM: 120 }), c(2, 30, { pointCount: 3 })];
    expect(recommendCourse(rec(30), list)).toBeNull();
  });

  it('휴식하는 날에는 코스를 추천하지 않는다', () => {
    expect(recommendCourse(rec(0, true), [c(1, 30)])).toBeNull();
  });
});

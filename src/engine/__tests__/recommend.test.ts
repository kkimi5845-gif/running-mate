import type { Profile } from '@/profile/options';

import { recommend, shouldAddWalking, summarizeHistory, workoutMinutes } from '../recommend';
import { LADDER, REASON_TEXT } from '../rules';
import type { BodyInfo, EngineInput, RunSummary } from '../types';

// 2026-10-07 (수) 저녁
const TODAY = new Date(2026, 9, 7, 19, 0);

const profile = (p: Partial<Profile> = {}): Profile => ({
  experience: 'under_6m',
  continuousRun: '5min',
  goal: 'habit',
  sessionsPerWeek: 3,
  minutesPerSession: 30,
  hasDiscomfort: false,
  discomfortAreas: [],
  ...p,
});

/** n일 전 아침 7시에 meters만큼 달린 기록 */
const run = (daysAgo: number, meters = 3000): RunSummary => ({
  startedAt: new Date(2026, 9, 7 - daysAgo, 7, 0).toISOString(),
  distanceM: meters,
  durationSec: 1800,
});

const input = (p: Partial<EngineInput> = {}): EngineInput => ({
  profile: profile(),
  body: null,
  recentRuns: [],
  today: TODAY,
  ...p,
});

describe('시작 단계 (프로필)', () => {
  it('달리기 어려움 → 걷기 위주 + 짧은 달리기 반복', () => {
    const r = recommend(input({ profile: profile({ continuousRun: 'hard' }) }));
    expect(r.rest).toBe(false);
    expect(r.level).toBe(0);
    expect(r.workout!.main).toEqual([
      { kind: 'run', minutes: 1 },
      { kind: 'walk', minutes: 2 },
    ]);
    expect(r.intensity).toBe('very_easy');
    expect(r.reasons).toEqual(['BASE_WALK_MOSTLY']);
  });

  it('러닝이 처음이면 달릴 수 있는 시간과 상관없이 걷기 위주', () => {
    const r = recommend(input({ profile: profile({ experience: 'none', continuousRun: '10_20min' }) }));
    expect(r.level).toBe(0);
  });

  it('5분 → 달리기·걷기 교차 구성', () => {
    const r = recommend(input({ profile: profile({ continuousRun: '5min' }) }));
    expect(r.workout!.main[0]).toEqual({ kind: 'run', minutes: 2 });
    expect(r.reasons[0]).toBe('BASE_INTERVALS');
  });

  it('10~20분 → 달리기 구간이 더 긴 교차 구성', () => {
    const r = recommend(input({ profile: profile({ continuousRun: '10_20min' }) }));
    expect(r.workout!.main[0]).toEqual({ kind: 'run', minutes: 5 });
  });

  it('30분 이상 → 지속 달리기', () => {
    const r = recommend(input({ profile: profile({ continuousRun: '30min_plus', minutesPerSession: 45 }) }));
    expect(r.workout!.main).toEqual([{ kind: 'run', minutes: 30 }]);
    expect(r.workout!.repeat).toBe(1);
    expect(r.reasons[0]).toBe('BASE_CONTINUOUS');
  });

  it('1회 가능 시간 안에 맞춘다 (준비·마무리 걷기 포함)', () => {
    for (const minutesPerSession of [20, 30, 45, 60]) {
      for (const continuousRun of ['hard', '5min', '10_20min', '30min_plus', '60min_plus'] as const) {
        const r = recommend(input({ profile: profile({ continuousRun, minutesPerSession }) }));
        expect(r.totalMinutes).toBeLessThanOrEqual(minutesPerSession);
        expect(r.totalMinutes).toBe(workoutMinutes(r.workout!));
      }
    }
  });

  it('20분처럼 짧으면 준비·마무리 걷기를 3분으로 줄인다', () => {
    const r = recommend(input({ profile: profile({ minutesPerSession: 20 }) }));
    expect(r.workout!.warmupMin).toBe(3);
    expect(r.workout!.cooldownMin).toBe(3);
  });
});

describe('불편한 부위', () => {
  it('강도를 한 단계 낮추고 이유를 남긴다', () => {
    const normal = recommend(input({ profile: profile({ continuousRun: '10_20min' }) }));
    const sore = recommend(input({ profile: profile({ continuousRun: '10_20min', hasDiscomfort: true }) }));
    expect(sore.level).toBe(normal.level - 1);
    expect(sore.reasons).toContain('DISCOMFORT_LOWER');
    expect(REASON_TEXT.DISCOMFORT_LOWER({ sessionsPerWeek: 3 })).toContain('전문가와 상담');
  });

  it('이미 가장 낮은 단계면 단계는 그대로, 휴식은 아님', () => {
    const r = recommend(input({ profile: profile({ continuousRun: 'hard', hasDiscomfort: true }) }));
    expect(r.rest).toBe(false);
    expect(r.level).toBe(0);
    expect(r.intensity).toBe('very_easy');
  });
});

describe('휴식 규칙', () => {
  it('최근 3일 연속 러닝 → 오늘은 휴식', () => {
    const r = recommend(input({ recentRuns: [run(1), run(2), run(3)], profile: profile({ sessionsPerWeek: 5 }) }));
    expect(r.rest).toBe(true);
    expect(r.workout).toBeNull();
    expect(r.reasons).toEqual(['REST_CONSECUTIVE_DAYS']);
  });

  it('2일 연속이면 쉬지 않는다', () => {
    const r = recommend(input({ recentRuns: [run(1), run(2), run(4)], profile: profile({ sessionsPerWeek: 5 }) }));
    expect(r.rest).toBe(false);
  });

  it('오늘 이미 달렸으면 휴식', () => {
    expect(recommend(input({ recentRuns: [run(0)] })).reasons).toEqual(['REST_ALREADY_RAN_TODAY']);
  });

  it('최근 7일에 목표 횟수를 채웠으면 휴식', () => {
    const r = recommend(input({ recentRuns: [run(1), run(3), run(5)], profile: profile({ sessionsPerWeek: 3 }) }));
    expect(r.reasons).toEqual(['REST_WEEKLY_TARGET_MET']);
    expect(REASON_TEXT.REST_WEEKLY_TARGET_MET({ sessionsPerWeek: 3 })).toContain('주 3회');
  });

  it('300m 미만의 시험 기록은 세지 않는다', () => {
    const r = recommend(input({ recentRuns: [run(0, 120)] }));
    expect(r.rest).toBe(false);
  });
});

describe('단계 올리기와 주간 증량 제한', () => {
  it('최근 2주에 3번 달릴 때마다 한 단계 (최대 2단계)', () => {
    const p = profile({ continuousRun: '5min', sessionsPerWeek: 7 });
    expect(recommend(input({ profile: p, recentRuns: [run(2), run(4), run(6)] })).level).toBe(2);
    const many = [run(2), run(4), run(6), run(8), run(9), run(10), run(11), run(12), run(13)];
    const r = recommend(input({ profile: p, recentRuns: many }));
    expect(r.level).toBe(3);
    expect(r.reasons).toContain('PROGRESS_UP');
  });

  it('지난주보다 주간 거리가 30% 넘게 늘면 이번 주는 증량하지 않는다', () => {
    const p = profile({ continuousRun: '5min', sessionsPerWeek: 7 });
    // 지난주 1회 3km, 이번 주 2회 6km(+100%) → 지난주 횟수(1회)로만 계산 → 단계 올림 없음
    const r = recommend(input({ profile: p, recentRuns: [run(2), run(4), run(9)] }));
    expect(r.reasons).toContain('WEEKLY_JUMP_HOLD');
    expect(r.reasons).not.toContain('PROGRESS_UP');
    expect(r.level).toBe(1);
  });

  it('30% 이내로 늘었으면 평소처럼 올린다', () => {
    const p = profile({ continuousRun: '5min', sessionsPerWeek: 7 });
    // 지난주 2회 6km, 이번 주 2회 7km(+17%)
    const r = recommend(input({ profile: p, recentRuns: [run(2, 3500), run(4, 3500), run(8), run(10)] }));
    expect(r.reasons).not.toContain('WEEKLY_JUMP_HOLD');
    expect(r.level).toBe(2);
  });

  it('지난주 기록이 없으면 증가율을 따지지 않는다', () => {
    const p = profile({ sessionsPerWeek: 7 });
    expect(recommend(input({ profile: p, recentRuns: [run(2)] })).reasons).not.toContain('WEEKLY_JUMP_HOLD');
  });
});

describe('몸 정보 (보수적 반영)', () => {
  const body = (b: Partial<BodyInfo>): BodyInfo => ({
    heightCm: null,
    weightKg: null,
    bodyFatPct: null,
    skeletalMuscleKg: null,
    ...b,
  });

  it('기준을 넘으면 세트마다 걷기 1분 추가', () => {
    const r = recommend(input({ body: body({ bodyFatPct: 38 }) }));
    expect(r.workout!.main).toEqual([
      { kind: 'run', minutes: 2 },
      { kind: 'walk', minutes: 3 },
    ]);
    expect(r.reasons).toContain('BODY_MORE_WALK');
  });

  it('지속 달리기 단계에서는 9분 달리고 1분 걷기로 나눈다', () => {
    const r = recommend(
      input({
        profile: profile({ continuousRun: '30min_plus', minutesPerSession: 45 }),
        body: body({ heightCm: 165, weightKg: 80 }), // 체질량지수 29.4
      }),
    );
    expect(r.workout!.main).toEqual([
      { kind: 'run', minutes: 9 },
      { kind: 'walk', minutes: 1 },
    ]);
    expect(r.workout!.repeat).toBe(3);
  });

  it('기준 아래거나 정보가 없으면 그대로', () => {
    expect(shouldAddWalking(null)).toBe(false);
    expect(shouldAddWalking(body({ bodyFatPct: 25, heightCm: 170, weightKg: 65 }))).toBe(false);
    expect(shouldAddWalking(body({ skeletalMuscleKg: 20 }))).toBe(false);
  });
});

describe('오늘 컨디션이 안 좋아요', () => {
  it('강도를 낮춘다', () => {
    const normal = recommend(input({ profile: profile({ continuousRun: '10_20min' }) }));
    const unwell = recommend(input({ profile: profile({ continuousRun: '10_20min' }), feelingUnwell: true }));
    expect(unwell.level).toBe(normal.level - 1);
    expect(unwell.reasons).toContain('UNWELL_LOWER');
  });

  it('더 낮출 수 없으면 휴식', () => {
    const r = recommend(input({ profile: profile({ continuousRun: 'hard' }), feelingUnwell: true }));
    expect(r.rest).toBe(true);
    expect(r.reasons).toEqual(['UNWELL_REST']);
  });
});

describe('기타', () => {
  it('같은 입력이면 같은 결과 (순수 함수)', () => {
    const i = input({ recentRuns: [run(2), run(5)] });
    expect(recommend(i)).toEqual(recommend(i));
  });

  it('연속 일수 계산', () => {
    expect(summarizeHistory({ today: TODAY, recentRuns: [run(1), run(2), run(4)] }).consecutiveDaysBeforeToday).toBe(2);
  });

  it('단계표는 달리기 비중이 점점 커진다', () => {
    const runShare = LADDER.map((s) => (s.kind === 'continuous' ? 1 : s.runMin / (s.runMin + s.walkMin)));
    for (let i = 1; i < runShare.length; i++) expect(runShare[i]).toBeGreaterThanOrEqual(runShare[i - 1]);
  });

  it('추천 문구에 진단·판정 표현이 없다', () => {
    const banned = ['비만', '과체중', '질환', '진단', '처방', '위험', '정상', '이상 소견'];
    for (const fn of Object.values(REASON_TEXT)) {
      const text = fn({ sessionsPerWeek: 3 });
      for (const word of banned) expect(text).not.toContain(word);
    }
  });
});

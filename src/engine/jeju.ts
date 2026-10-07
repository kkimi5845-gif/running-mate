/**
 * 제주 코스 추천 (순수 함수 — 단위 테스트 대상)
 * 오늘 추천(단계·시간)과 프로필에 맞는 코스를 앱에 들어 있는 제주 코스 목록에서 고른다.
 * 지금 위치와의 거리는 휴대폰 안에서만 계산하고, 위치는 어디로도 보내지 않는다.
 */
import type { JejuArea, JejuCourse, JejuLevel } from '@/jeju/courses';
import { distanceMeters } from '@/location/geo';
import type { Profile } from '@/profile/options';

import {
  JEJU_AVOID_ROUGH_REASONS,
  JEJU_HARD_MIN_RUN,
  JEJU_LEVEL_GAP_PENALTY_KM,
  JEJU_NEAR_LIMIT_KM,
  JEJU_RUN_KMH,
  JEJU_WALK_KMH,
  LADDER,
} from './rules';
import type { Recommendation } from './types';

export type JejuTarget = {
  level: JejuLevel;
  km: number | null; // 쉬는 날이면 null
  avoidRough: boolean;
};

export type JejuPick = {
  course: JejuCourse;
  awayKm: number | null; // 지금 위치에서 직선거리 (위치를 모르면 null)
  how: string | null; // 오늘 달리는 방법 (쉬는 날이면 null)
  exactLevel: boolean; // 오늘 수준과 딱 맞는 코스인지
};

export type JejuSkipReason = 'harder' | 'rough';

export type JejuResult = {
  picks: JejuPick[];
  others: { course: JejuCourse; why: JejuSkipReason }[];
  usedLocation: boolean;
};

const round1 = (n: number) => Math.round(n * 10) / 10;

/** 1.0 → '1', 2.45 → '2.5' */
export function kmText(km: number): string {
  return String(round1(km));
}

/** 오늘 추천으로 코스 수준, 달릴 거리(어림), 언덕을 피할지를 정한다 */
export function jejuTarget(rec: Recommendation, profile: Profile): JejuTarget {
  const step = LADDER[Math.min(Math.max(rec.level, 0), LADDER.length - 1)];
  const level: JejuLevel = step.kind === 'intervals' ? 1 : step.runMin >= JEJU_HARD_MIN_RUN ? 3 : 2;

  let km: number | null = null;
  if (!rec.rest && rec.workout) {
    const w = rec.workout;
    const sum = (kind: 'run' | 'walk') =>
      w.main.filter((s) => s.kind === kind).reduce((a, s) => a + s.minutes, 0) * w.repeat;
    const runMin = sum('run');
    const walkMin = sum('walk') + w.warmupMin + w.cooldownMin;
    km = round1((runMin * JEJU_RUN_KMH + walkMin * JEJU_WALK_KMH) / 60);
  }

  const avoidRough = profile.hasDiscomfort || rec.reasons.some((r) => JEJU_AVOID_ROUGH_REASONS.includes(r));
  return { level, km, avoidRough };
}

/** 코스를 오늘 거리만큼 달리는 방법 */
export function howToRun(c: JejuCourse, targetKm: number): string {
  if (c.shape === 'track') {
    return `트랙 약 ${Math.max(1, Math.round(targetKm / c.km))}바퀴`;
  }
  if (c.shape === 'loop') {
    const laps = Math.max(1, Math.round(targetKm / c.km));
    return laps === 1 ? '한 바퀴' : `${laps}바퀴`;
  }
  const half = targetKm / 2;
  if (half >= c.km) return `끝까지 갔다가 돌아오기 (왕복 약 ${kmText(c.km * 2)}km)`;
  return `약 ${kmText(half)}km 가서 돌아오기`;
}

/** 오늘 거리로 달렸을 때 실제 거리 (적합도 비교용) */
function plannedKm(c: JejuCourse, targetKm: number): number {
  if (c.shape === 'line') return Math.min(targetKm, c.km * 2);
  return c.km * Math.max(1, Math.round(targetKm / c.km));
}

export function recommendJejuCourses(
  courses: JejuCourse[],
  target: JejuTarget,
  opts: {
    here?: { lat: number; lng: number } | null;
    area?: JejuArea | null;
    /** 사용자가 직접 고른 수준. 고르면 그 수준 코스만 보여 준다 (내 수준보다 높아도 보여 줌) */
    level?: JejuLevel | null;
  } = {},
): JejuResult {
  const chosen = opts.level ?? null;
  const inArea = courses.filter((c) => (!opts.area || c.area === opts.area) && (!chosen || c.level === chosen));
  const here = opts.here ?? null;

  const away = (c: JejuCourse) => (here ? distanceMeters(here, c) / 1000 : null);
  const usedLocation =
    here !== null && courses.some((c) => (away(c) ?? Infinity) <= JEJU_NEAR_LIMIT_KM);

  const picks: (JejuPick & { score: number; fit: number; order: number })[] = [];
  const others: JejuResult['others'] = [];

  inArea.forEach((c, order) => {
    if (!chosen && c.level > target.level) {
      others.push({ course: c, why: 'harder' });
      return;
    }
    if (target.avoidRough && c.rough) {
      others.push({ course: c, why: 'rough' });
      return;
    }
    const awayKm = usedLocation ? away(c) : null;
    const score = (awayKm ?? 0) + (chosen ? 0 : (target.level - c.level) * JEJU_LEVEL_GAP_PENALTY_KM);
    const fit = target.km === null ? 0 : Math.abs(plannedKm(c, target.km) - target.km);
    picks.push({
      course: c,
      awayKm: awayKm === null ? null : round1(awayKm),
      how: target.km === null ? null : howToRun(c, target.km),
      exactLevel: c.level === target.level,
      score,
      fit,
      order,
    });
  });

  picks.sort((a, b) => a.score - b.score || a.fit - b.fit || a.order - b.order);
  return {
    picks: picks.map(({ course, awayKm, how, exactLevel }) => ({ course, awayKm, how, exactLevel })),
    others,
    usedLocation,
  };
}

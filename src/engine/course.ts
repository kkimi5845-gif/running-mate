/**
 * 나에게 맞는 코스 추천 (순수 함수 — 단위 테스트 대상)
 * 내가 달렸던 기록 중에서 오늘 추천 시간과 걸린 시간이 가장 비슷한 코스를 고른다.
 * 모든 계산은 휴대폰 안에서만 한다.
 */
import { COURSE_MIN_POINTS, COURSE_TIME_TOLERANCE, MIN_COUNTED_RUN_M } from './rules';
import type { Recommendation } from './types';

export type CourseCandidate = {
  runId: number;
  startedAt: string; // ISO
  distanceM: number;
  durationSec: number;
  pointCount: number; // 거리 계산에 쓴 좌표 수
};

export type CourseSuggestion = CourseCandidate & {
  diffRatio: number; // 추천 시간과의 차이 비율 (0이면 똑같음)
};

export function recommendCourse(rec: Recommendation, candidates: CourseCandidate[]): CourseSuggestion | null {
  if (rec.rest || rec.totalMinutes <= 0) return null;
  const target = rec.totalMinutes * 60;

  let best: CourseSuggestion | null = null;
  for (const c of candidates) {
    if (c.distanceM < MIN_COUNTED_RUN_M || c.pointCount < COURSE_MIN_POINTS || c.durationSec <= 0) continue;
    const diffRatio = Math.abs(c.durationSec - target) / target;
    if (diffRatio > COURSE_TIME_TOLERANCE) continue;
    const better =
      !best ||
      diffRatio < best.diffRatio - 1e-9 ||
      (Math.abs(diffRatio - best.diffRatio) <= 1e-9 && c.startedAt > best.startedAt); // 같으면 최근 것
    if (better) best = { ...c, diffRatio };
  }
  return best;
}

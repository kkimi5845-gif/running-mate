/**
 * 음성 코칭용 운동 계획 (순수 함수 — 단위 테스트 대상)
 * 추천 엔진의 Workout을 "구간 목록"으로 펼치고, 지금 몇 번째 구간인지 계산한다.
 * 시간은 일시정지를 뺀 "달린 시간(초)" 기준이다.
 */
import type { Workout } from '@/engine/types';

export type PlanPhase = 'warmup' | 'main' | 'cooldown';

export type PlanSegment = {
  kind: 'walk' | 'run';
  phase: PlanPhase;
  seconds: number;
  startSec: number; // 계획 시작부터 이 구간이 시작되는 시각
  set: number | null; // 본 운동이면 몇 번째 세트(1부터), 아니면 null
};

/** runs.plan_json에 저장하는 모양 */
export type RunPlan = {
  segments: PlanSegment[];
  totalSec: number;
  sets: number;
};

export function expandPlan(w: Workout): RunPlan {
  const segments: PlanSegment[] = [];
  let t = 0;
  const push = (kind: 'walk' | 'run', phase: PlanPhase, minutes: number, set: number | null) => {
    if (minutes <= 0) return;
    segments.push({ kind, phase, seconds: minutes * 60, startSec: t, set });
    t += minutes * 60;
  };
  push('walk', 'warmup', w.warmupMin, null);
  for (let i = 1; i <= w.repeat; i++) {
    for (const s of w.main) push(s.kind, 'main', s.minutes, i);
  }
  push('walk', 'cooldown', w.cooldownMin, null);
  return { segments, totalSec: t, sets: w.repeat };
}

export type PlanPosition =
  | { done: false; index: number; segment: PlanSegment; remainingSec: number; next: PlanSegment | null }
  | { done: true };

/** 달린 시간(초)에 해당하는 구간 */
export function positionAt(plan: RunPlan, elapsedSec: number): PlanPosition {
  for (let i = 0; i < plan.segments.length; i++) {
    const s = plan.segments[i];
    if (elapsedSec < s.startSec + s.seconds) {
      return {
        done: false,
        index: i,
        segment: s,
        remainingSec: Math.ceil(s.startSec + s.seconds - elapsedSec),
        next: plan.segments[i + 1] ?? null,
      };
    }
  }
  return { done: true };
}

export function parsePlan(json: string | null): RunPlan | null {
  if (!json) return null;
  try {
    const p = JSON.parse(json) as RunPlan;
    return Array.isArray(p.segments) ? p : null;
  } catch {
    return null;
  }
}

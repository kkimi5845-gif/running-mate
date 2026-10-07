/**
 * 음성 안내 시점 판단 (순수 함수 — 단위 테스트 대상)
 * 직전 확인 때와 지금을 비교해서, 그 사이에 지나간 "알릴 일"을 돌려준다.
 * 같은 안내를 두 번 하지 않도록 각 안내에는 고유 key가 있다.
 */
import { positionAt, type PlanSegment, type RunPlan } from './plan';

export type Cue =
  | { key: string; type: 'segment'; segment: PlanSegment; isLastSet: boolean; sets: number }
  | { key: string; type: 'planDone' }
  | { key: string; type: 'km'; km: number; avgPaceSecPerKm: number | null };

export type CoachSnapshot = { elapsedSec: number; distanceM: number };

export function cuesBetween(
  plan: RunPlan | null,
  prev: CoachSnapshot,
  now: CoachSnapshot,
): Cue[] {
  const cues: Cue[] = [];

  if (plan) {
    // 직전 이후에 새로 시작된 구간들 (시작 시각 0초 구간은 prev가 -1일 때만)
    for (let i = 0; i < plan.segments.length; i++) {
      const s = plan.segments[i];
      if (s.startSec > prev.elapsedSec && s.startSec <= now.elapsedSec) {
        cues.push({ key: `seg:${i}`, type: 'segment', segment: s, isLastSet: s.set === plan.sets, sets: plan.sets });
      }
    }
    // 같은 순간에 여러 구간을 건너뛰었으면(앱이 잠깐 멈췄던 경우) 마지막 것만 말한다
    const segCues = cues.filter((c) => c.type === 'segment');
    if (segCues.length > 1) cues.splice(0, cues.length, segCues[segCues.length - 1]);

    if (plan.totalSec > prev.elapsedSec && plan.totalSec <= now.elapsedSec && positionAt(plan, now.elapsedSec).done) {
      cues.length = 0; // 끝났으면 구간 안내 대신 완료 안내만
      cues.push({ key: 'done', type: 'planDone' });
    }
  }

  const prevKm = Math.floor(prev.distanceM / 1000);
  const nowKm = Math.floor(now.distanceM / 1000);
  if (nowKm > prevKm && nowKm >= 1) {
    const avg = now.distanceM >= 100 && now.elapsedSec > 0 ? now.elapsedSec / (now.distanceM / 1000) : null;
    cues.push({ key: `km:${nowKm}`, type: 'km', km: nowKm, avgPaceSecPerKm: avg });
  }
  return cues;
}

/**
 * 음성 안내 시점 판단 (순수 함수 — 단위 테스트 대상)
 * 직전 확인 때와 지금을 비교해서, 그 사이에 지나간 "알릴 일"을 돌려준다.
 * 같은 안내를 두 번 하지 않도록 각 안내에는 고유 key가 있다.
 */
import { positionAt, type PlanSegment, type RunPlan } from './plan';

export type Cue =
  | { key: string; type: 'segment'; segment: PlanSegment; isLastSet: boolean; sets: number }
  | { key: string; type: 'planDone' }
  | { key: string; type: 'km'; km: number; avgPaceSecPerKm: number | null }
  | { key: string; type: 'cheer'; kind: CheerKind; n: number };

/** 응원: half(계획의 반), almost(달리기 구간 끝나기 30초 전), random(몇 분마다) */
export type CheerKind = 'half' | 'almost' | 'random';

/** 이 간격(초)마다 응원 한마디 (다른 안내가 없을 때만) */
export const CHEER_EVERY_SEC = 180;
/** 달리기 구간이 이보다 길면 끝나기 30초 전에 "조금만 더!" */
const ALMOST_MIN_SEGMENT_SEC = 90;
const ALMOST_BEFORE_SEC = 30;

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

  // 응원은 다른 안내(구간·완료)가 없을 때만, 한 번에 하나
  if (cues.length === 0) {
    const crossed = (t: number) => t > prev.elapsedSec && t <= now.elapsedSec;
    if (plan && crossed(plan.totalSec / 2)) {
      cues.push({ key: 'half', type: 'cheer', kind: 'half', n: 0 });
    } else if (plan) {
      plan.segments.forEach((seg, i) => {
        if (cues.length > 0 || seg.kind !== 'run' || seg.seconds < ALMOST_MIN_SEGMENT_SEC) return;
        if (crossed(seg.startSec + seg.seconds - ALMOST_BEFORE_SEC)) {
          cues.push({ key: `almost:${i}`, type: 'cheer', kind: 'almost', n: i });
        }
      });
    }
    const nowN = Math.floor(now.elapsedSec / CHEER_EVERY_SEC);
    const prevN = Math.floor(Math.max(0, prev.elapsedSec) / CHEER_EVERY_SEC);
    const planOver = plan !== null && now.elapsedSec >= plan.totalSec;
    if (cues.length === 0 && nowN > prevN && nowN >= 1 && !planOver) {
      cues.push({ key: `cheer:${nowN}`, type: 'cheer', kind: 'random', n: nowN });
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

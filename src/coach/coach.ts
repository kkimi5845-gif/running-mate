/**
 * 달리는 중 음성 코칭 실행.
 * 측정 화면(1초마다)과 백그라운드 위치 작업(좌표를 받을 때마다) 양쪽에서 coachTick()을 부른다.
 * 그래서 화면이 꺼져 있어도(개발용 빌드) 좌표가 들어올 때마다 안내가 나온다.
 */
import type { SQLiteDatabase } from 'expo-sqlite';

import { elapsedSec, getActiveRun } from '@/db/runs';
import { getMateSettings } from '@/db/settings';
import { cueSpeech } from '@/mate/coachLines';
import { speakQueued } from '@/mate/voice';

import { cuesBetween, type CoachSnapshot } from './cues';
import { parsePlan } from './plan';

type CoachState = { runId: number; last: CoachSnapshot; spoken: Set<string> };

let state: CoachState | null = null;
let muted = false;

/** 이번 러닝 동안만 음성 끄기 (설정의 "소리 끄기"와는 별개) */
export function setCoachMuted(value: boolean): void {
  muted = value;
}
export function isCoachMuted(): boolean {
  return muted;
}

async function tick(db: SQLiteDatabase): Promise<void> {
  const run = await getActiveRun(db);
  if (!run) {
    state = null;
    muted = false;
    return;
  }
  if (run.status !== 'recording') return;

  const snap: CoachSnapshot = { elapsedSec: Math.floor(elapsedSec(run, Date.now())), distanceM: run.distanceM };

  if (!state || state.runId !== run.id) {
    // 방금 시작한 러닝이면 첫 안내부터, 앱을 다시 열어 이어 보는 중이면 지난 안내는 건너뛴다
    const fresh = snap.elapsedSec < 3;
    state = { runId: run.id, last: fresh ? { elapsedSec: -1, distanceM: 0 } : snap, spoken: new Set() };
    if (!fresh) return;
  }

  const cues = cuesBetween(parsePlan(run.planJson), state.last, snap).filter((c) => !state!.spoken.has(c.key));
  state.last = snap;
  if (cues.length === 0) return;
  for (const c of cues) state.spoken.add(c.key);

  const mate = await getMateSettings(db);
  if (!mate.voiceOn || muted) return;
  speakQueued(cues.map((c) => cueSpeech(c, mate.tone)).join(' '), mate.tone);
}

// 화면과 백그라운드에서 동시에 불려도 한 번에 하나씩 처리한다(같은 안내 두 번 방지)
let chain: Promise<void> = Promise.resolve();
export function coachTick(db: SQLiteDatabase): Promise<void> {
  chain = chain.then(() => tick(db)).catch((e) => console.warn('[coach]', e));
  return chain;
}

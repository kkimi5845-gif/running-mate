import type { SQLiteDatabase } from 'expo-sqlite';

import { latestInbody } from '@/db/inbody';
import { getProfile } from '@/db/profile';
import { listFinishedRuns } from '@/db/runs';

import type { EngineInput } from './types';

/** DB에서 추천 엔진에 넣을 값을 모은다. 프로필이 없으면(온보딩 전) null */
export async function loadEngineInput(
  db: SQLiteDatabase,
  today: Date,
  feelingUnwell = false,
): Promise<EngineInput | null> {
  const [profile, inbody, runs] = await Promise.all([getProfile(db), latestInbody(db), listFinishedRuns(db)]);
  if (!profile) return null;

  const twoWeeksAgo = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 13).getTime();
  return {
    profile,
    body: inbody
      ? {
          heightCm: inbody.heightCm,
          weightKg: inbody.weightKg,
          bodyFatPct: inbody.bodyFatPct,
          skeletalMuscleKg: inbody.skeletalMuscleKg,
        }
      : null,
    recentRuns: runs
      .filter((r) => new Date(r.startedAt).getTime() >= twoWeeksAgo)
      .map((r) => ({ startedAt: r.startedAt, distanceM: r.distanceM, durationSec: r.durationSec })),
    today,
    feelingUnwell,
  };
}

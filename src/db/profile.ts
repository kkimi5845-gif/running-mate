import type { SQLiteDatabase } from 'expo-sqlite';

import type { DiscomfortArea, Profile } from '@/profile/options';

type ProfileRow = {
  experience: string;
  continuous_run: string;
  goal: string;
  sessions_per_week: number;
  minutes_per_session: number;
  has_discomfort: number;
  discomfort_areas: string | null;
};

function parseAreas(json: string | null): DiscomfortArea[] {
  if (!json) return [];
  try {
    const parsed: unknown = JSON.parse(json);
    return Array.isArray(parsed) ? (parsed as DiscomfortArea[]) : [];
  } catch {
    return [];
  }
}

/** 온보딩을 마치지 않았으면 null */
export async function getProfile(db: SQLiteDatabase): Promise<Profile | null> {
  const row = await db.getFirstAsync<ProfileRow>(
    `SELECT experience, continuous_run, goal, sessions_per_week, minutes_per_session,
            has_discomfort, discomfort_areas
       FROM profile WHERE id = 1`,
  );
  if (!row) return null;
  return {
    experience: row.experience as Profile['experience'],
    continuousRun: row.continuous_run as Profile['continuousRun'],
    goal: row.goal as Profile['goal'],
    sessionsPerWeek: row.sessions_per_week,
    minutesPerSession: row.minutes_per_session,
    hasDiscomfort: row.has_discomfort === 1,
    discomfortAreas: parseAreas(row.discomfort_areas),
  };
}

/** 처음 저장(온보딩)과 수정(설정) 모두 이 함수 하나로 처리한다. */
export async function saveProfile(db: SQLiteDatabase, p: Profile): Promise<void> {
  const areas = p.hasDiscomfort ? JSON.stringify(p.discomfortAreas) : null;
  await db.runAsync(
    `INSERT INTO profile (id, experience, continuous_run, goal, sessions_per_week,
                          minutes_per_session, has_discomfort, discomfort_areas)
     VALUES (1, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (id) DO UPDATE SET
       experience = excluded.experience,
       continuous_run = excluded.continuous_run,
       goal = excluded.goal,
       sessions_per_week = excluded.sessions_per_week,
       minutes_per_session = excluded.minutes_per_session,
       has_discomfort = excluded.has_discomfort,
       discomfort_areas = excluded.discomfort_areas,
       updated_at = datetime('now')`,
    [
      p.experience,
      p.continuousRun,
      p.goal,
      p.sessionsPerWeek,
      p.minutesPerSession,
      p.hasDiscomfort ? 1 : 0,
      areas,
    ],
  );
}

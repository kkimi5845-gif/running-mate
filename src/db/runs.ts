import type { SQLiteDatabase } from 'expo-sqlite';

import { evaluatePoint, type GeoPoint } from '@/location/geo';

export type RunStatus = 'recording' | 'paused' | 'finished';

export type Run = {
  id: number;
  status: RunStatus;
  startedAt: string; // ISO
  endedAt: string | null;
  durationSec: number; // 일시정지 시간을 뺀, 지금까지 확정된 시간
  activeSince: number | null; // 지금 달리는 구간의 시작(ms)
  distanceM: number;
  shoeId: number | null;
};

export type StoredPoint = GeoPoint & {
  altitude: number | null;
  speed: number | null;
  used: boolean;
};

/** GPS에서 받은 좌표 1개 (expo-location의 LocationObject에서 필요한 것만) */
export type IncomingLocation = {
  timestamp: number;
  coords: {
    latitude: number;
    longitude: number;
    altitude: number | null;
    accuracy: number | null;
    speed: number | null;
  };
};

type RunRow = {
  id: number;
  status: RunStatus;
  started_at: string;
  ended_at: string | null;
  duration_sec: number;
  active_since: number | null;
  distance_m: number;
  shoe_id: number | null;
};

const RUN_COLUMNS =
  'id, status, started_at, ended_at, duration_sec, active_since, distance_m, shoe_id';

function toRun(r: RunRow): Run {
  return {
    id: r.id,
    status: r.status,
    startedAt: r.started_at,
    endedAt: r.ended_at,
    durationSec: r.duration_sec,
    activeSince: r.active_since,
    distanceM: r.distance_m,
    shoeId: r.shoe_id,
  };
}

/** 지금까지 달린 시간(초). 달리는 중이면 현재 구간까지 더한다. */
export function elapsedSec(run: Run, now: number): number {
  const live = run.activeSince !== null ? (now - run.activeSince) / 1000 : 0;
  return run.durationSec + Math.max(0, live);
}

/** 진행 중(기록 중·일시정지)인 러닝. 없으면 null */
export async function getActiveRun(db: SQLiteDatabase): Promise<Run | null> {
  const row = await db.getFirstAsync<RunRow>(
    `SELECT ${RUN_COLUMNS} FROM runs WHERE status IN ('recording', 'paused') ORDER BY id DESC LIMIT 1`,
  );
  return row ? toRun(row) : null;
}

export async function getRun(db: SQLiteDatabase, id: number): Promise<Run | null> {
  const row = await db.getFirstAsync<RunRow>(`SELECT ${RUN_COLUMNS} FROM runs WHERE id = ?`, [id]);
  return row ? toRun(row) : null;
}

/** 끝난 러닝 목록 (최근 것 먼저) */
export async function listFinishedRuns(db: SQLiteDatabase): Promise<Run[]> {
  const rows = await db.getAllAsync<RunRow>(
    `SELECT ${RUN_COLUMNS} FROM runs WHERE status = 'finished' ORDER BY started_at DESC`,
  );
  return rows.map(toRun);
}

export async function createRun(db: SQLiteDatabase, now: number): Promise<number> {
  const result = await db.runAsync(
    `INSERT INTO runs (status, started_at, active_since) VALUES ('recording', ?, ?)`,
    [new Date(now).toISOString(), now],
  );
  return result.lastInsertRowId;
}

export async function pauseRun(db: SQLiteDatabase, run: Run, now: number): Promise<void> {
  if (run.status !== 'recording') return;
  await db.runAsync(
    `UPDATE runs SET status = 'paused', duration_sec = ?, active_since = NULL WHERE id = ?`,
    [Math.round(elapsedSec(run, now)), run.id],
  );
}

export async function resumeRun(db: SQLiteDatabase, run: Run, now: number): Promise<void> {
  if (run.status !== 'paused') return;
  await db.runAsync(`UPDATE runs SET status = 'recording', active_since = ? WHERE id = ?`, [now, run.id]);
}

export async function finishRun(db: SQLiteDatabase, run: Run, now: number): Promise<void> {
  await db.runAsync(
    `UPDATE runs SET status = 'finished', duration_sec = ?, active_since = NULL, ended_at = ? WHERE id = ?`,
    [Math.round(elapsedSec(run, now)), new Date(now).toISOString(), run.id],
  );
}

export async function deleteRun(db: SQLiteDatabase, id: number): Promise<void> {
  // run_points는 ON DELETE CASCADE로 함께 지워진다
  await db.runAsync('DELETE FROM runs WHERE id = ?', [id]);
}

type PointRow = {
  recorded_at: number;
  latitude: number;
  longitude: number;
  altitude: number | null;
  accuracy: number | null;
  speed: number | null;
  used_for_distance: number;
};

const toPoint = (r: PointRow): StoredPoint => ({
  t: r.recorded_at,
  lat: r.latitude,
  lng: r.longitude,
  altitude: r.altitude,
  accuracy: r.accuracy,
  speed: r.speed,
  used: r.used_for_distance === 1,
});

/** 경로 좌표. onlyUsed면 거리 계산에 쓴 점만 */
export async function getRunPoints(
  db: SQLiteDatabase,
  runId: number,
  opts: { onlyUsed?: boolean; sinceMs?: number } = {},
): Promise<StoredPoint[]> {
  const rows = await db.getAllAsync<PointRow>(
    `SELECT recorded_at, latitude, longitude, altitude, accuracy, speed, used_for_distance
       FROM run_points
      WHERE run_id = ? ${opts.onlyUsed ? 'AND used_for_distance = 1' : ''} AND recorded_at >= ?
      ORDER BY recorded_at, id`,
    [runId, opts.sinceMs ?? 0],
  );
  return rows.map(toPoint);
}

/** 가장 최근에 받은 좌표 1개 (GPS 신호 상태 표시용) */
export async function getLastPoint(db: SQLiteDatabase, runId: number): Promise<StoredPoint | null> {
  const row = await db.getFirstAsync<PointRow>(
    `SELECT recorded_at, latitude, longitude, altitude, accuracy, speed, used_for_distance
       FROM run_points WHERE run_id = ? ORDER BY recorded_at DESC, id DESC LIMIT 1`,
    [runId],
  );
  return row ? toPoint(row) : null;
}

/**
 * GPS에서 받은 좌표를 진행 중인 러닝에 저장하고 거리를 늘린다.
 * 백그라운드 작업과 화면(포그라운드) 양쪽에서 같은 함수를 쓴다.
 * - 일시정지 중이면 무시한다.
 * - 원본 좌표는 모두 저장하고, 거리 계산에 쓸지(used_for_distance)만 표시한다.
 */
export async function ingestLocations(db: SQLiteDatabase, locations: IncomingLocation[]): Promise<void> {
  if (locations.length === 0) return;
  const run = await getActiveRun(db);
  if (!run || run.status !== 'recording' || run.activeSince === null) return;
  const segmentStart = run.activeSince;

  await db.withTransactionAsync(async () => {
    // 이번 구간(마지막 재개 이후)에서 마지막으로 거리 계산에 쓴 점
    const lastRow = await db.getFirstAsync<PointRow>(
      `SELECT recorded_at, latitude, longitude, altitude, accuracy, speed, used_for_distance
         FROM run_points
        WHERE run_id = ? AND used_for_distance = 1 AND recorded_at >= ?
        ORDER BY recorded_at DESC, id DESC LIMIT 1`,
      [run.id, segmentStart],
    );
    let prev: GeoPoint | null = lastRow ? toPoint(lastRow) : null;
    let added = 0;

    const sorted = [...locations].sort((a, b) => a.timestamp - b.timestamp);
    for (const loc of sorted) {
      if (loc.timestamp < segmentStart) continue; // 일시정지 중이던 때의 좌표
      const p: GeoPoint = {
        t: loc.timestamp,
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
        accuracy: loc.coords.accuracy,
      };
      const e = evaluatePoint(prev, p);
      await db.runAsync(
        `INSERT INTO run_points (run_id, recorded_at, latitude, longitude, altitude, accuracy, speed, used_for_distance)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [run.id, p.t, p.lat, p.lng, loc.coords.altitude, p.accuracy, loc.coords.speed, e.used ? 1 : 0],
      );
      if (e.used) {
        added += e.addMeters;
        prev = p;
      }
    }

    if (added > 0) {
      await db.runAsync('UPDATE runs SET distance_m = distance_m + ? WHERE id = ?', [added, run.id]);
    }
  });
}

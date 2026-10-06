/**
 * 러닝 기록 DB 로직을 실제 SQLite(node:sqlite)로 확인한다.
 * expo-sqlite와 같은 모양의 함수만 흉내 낸 작은 어댑터를 쓴다.
 */
import { DatabaseSync } from 'node:sqlite';
import type { SQLiteDatabase } from 'expo-sqlite';

import { MIGRATIONS } from '../migrations';
import {
  createRun,
  elapsedSec,
  finishRun,
  getActiveRun,
  getRun,
  getRunPoints,
  ingestLocations,
  pauseRun,
  resumeRun,
  type IncomingLocation,
} from '../runs';

type Params = (string | number | null)[];

function makeDb(): SQLiteDatabase {
  const raw = new DatabaseSync(':memory:');
  raw.exec('PRAGMA foreign_keys = ON;');
  for (const m of MIGRATIONS) raw.exec(m.sql);
  const db = {
    getFirstAsync: async (sql: string, params: Params = []) => raw.prepare(sql).get(...params) ?? null,
    getAllAsync: async (sql: string, params: Params = []) => raw.prepare(sql).all(...params),
    runAsync: async (sql: string, params: Params = []) => {
      const r = raw.prepare(sql).run(...params);
      return { lastInsertRowId: Number(r.lastInsertRowid), changes: Number(r.changes) };
    },
    withTransactionAsync: async (task: () => Promise<void>) => {
      raw.exec('BEGIN');
      try {
        await task();
        raw.exec('COMMIT');
      } catch (e) {
        raw.exec('ROLLBACK');
        throw e;
      }
    },
  };
  return db as unknown as SQLiteDatabase;
}

const T0 = Date.UTC(2026, 9, 7, 0, 0, 0);
// 0.00005도 ≈ 5.6m. 1초마다 5.6m ≈ 3분/km 속도
const loc = (sec: number, step: number, accuracy = 5): IncomingLocation => ({
  timestamp: T0 + sec * 1000,
  coords: { latitude: 37.5 + step * 0.00005, longitude: 127, altitude: 30, accuracy, speed: 3 },
});

describe('러닝 기록', () => {
  it('좌표를 저장하고 거리를 늘린다. 튀는 점·정확도 나쁜 점은 원본만 저장한다', async () => {
    const db = makeDb();
    const id = await createRun(db, T0);
    await ingestLocations(db, [loc(0, 0), loc(1, 1), loc(2, 2)]);
    await ingestLocations(db, [loc(3, 200)]); // 1초에 1km 점프
    await ingestLocations(db, [loc(4, 3, 60)]); // 정확도 나쁨
    await ingestLocations(db, [loc(5, 4)]);

    const run = (await getRun(db, id))!;
    expect(run.distanceM).toBeCloseTo(4 * 5.56, 0);
    expect(await getRunPoints(db, id)).toHaveLength(6);
    expect(await getRunPoints(db, id, { onlyUsed: true })).toHaveLength(4);
  });

  it('일시정지 중 좌표는 무시하고, 다시 시작하면 그 자리부터 새로 잰다', async () => {
    const db = makeDb();
    const id = await createRun(db, T0);
    await ingestLocations(db, [loc(0, 0), loc(10, 10)]); // 10초에 56m

    await pauseRun(db, (await getRun(db, id))!, T0 + 10_000);
    await ingestLocations(db, [loc(20, 50)]); // 일시정지 중 → 무시
    expect(await getRunPoints(db, id)).toHaveLength(2);

    await resumeRun(db, (await getRun(db, id))!, T0 + 60_000);
    // 쉬는 동안 100칸(560m) 걸어갔어도 그 거리는 더하지 않는다
    await ingestLocations(db, [loc(60, 110), loc(70, 120)]);

    const run = (await getRun(db, id))!;
    expect(run.distanceM).toBeCloseTo(2 * 55.6, 0);
    // 시간: 처음 10초 + 다시 시작 후 20초 = 30초 (쉬는 50초 제외)
    expect(elapsedSec(run, T0 + 80_000)).toBe(30);

    await finishRun(db, run, T0 + 80_000);
    const done = (await getRun(db, id))!;
    expect(done.status).toBe('finished');
    expect(done.durationSec).toBe(30);
    expect(await getActiveRun(db)).toBeNull();
  });

  it('끝난 러닝에는 좌표가 더 들어가지 않는다', async () => {
    const db = makeDb();
    const id = await createRun(db, T0);
    await finishRun(db, (await getRun(db, id))!, T0 + 1000);
    await ingestLocations(db, [loc(2, 0)]);
    expect(await getRunPoints(db, id)).toHaveLength(0);
  });
});

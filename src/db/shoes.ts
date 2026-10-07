import type { SQLiteDatabase } from 'expo-sqlite';

import { shoeStatus, type ShoeStatus } from '@/shoes/status';

/** 신발 + 누적 거리. 누적 거리는 저장하지 않고 끝난 러닝 기록에서 매번 합산한다(숫자가 어긋나지 않게). */
export type Shoe = {
  id: number;
  name: string;
  photoUri: string | null;
  replaceKm: number;
  initialKm: number; // 앱에 등록하기 전에 이미 달린 거리
  retired: boolean; // 더 이상 신지 않음(목록 아래로, 선택지에서 숨김)
  runKm: number; // 이 앱에서 기록한 거리 합
  runCount: number;
  totalKm: number; // initialKm + runKm
  status: ShoeStatus;
};

export type ShoeInput = {
  name: string;
  photoUri: string | null;
  replaceKm: number;
  initialKm: number;
};

type Row = {
  id: number;
  name: string;
  photo_uri: string | null;
  replace_km: number;
  initial_km: number;
  retired: number;
  run_m: number | null;
  run_count: number;
};

const SELECT_WITH_TOTALS = `
  SELECT s.id, s.name, s.photo_uri, s.replace_km, s.initial_km, s.retired,
         COALESCE(SUM(r.distance_m), 0) AS run_m,
         COUNT(r.id) AS run_count
    FROM shoes s
    LEFT JOIN runs r ON r.shoe_id = s.id AND r.status = 'finished'`;

function toShoe(r: Row): Shoe {
  const runKm = (r.run_m ?? 0) / 1000;
  const totalKm = r.initial_km + runKm;
  return {
    id: r.id,
    name: r.name,
    photoUri: r.photo_uri,
    replaceKm: r.replace_km,
    initialKm: r.initial_km,
    retired: r.retired === 1,
    runKm,
    runCount: r.run_count,
    totalKm,
    status: shoeStatus(totalKm, r.replace_km),
  };
}

/** 신는 신발 먼저(최근 등록 순), 보관한 신발은 뒤로 */
export async function listShoes(db: SQLiteDatabase): Promise<Shoe[]> {
  const rows = await db.getAllAsync<Row>(
    `${SELECT_WITH_TOTALS} GROUP BY s.id ORDER BY s.retired, s.id DESC`,
  );
  return rows.map(toShoe);
}

export async function getShoe(db: SQLiteDatabase, id: number): Promise<Shoe | null> {
  const row = await db.getFirstAsync<Row>(`${SELECT_WITH_TOTALS} WHERE s.id = ? GROUP BY s.id`, [id]);
  return row ? toShoe(row) : null;
}

export async function insertShoe(db: SQLiteDatabase, v: ShoeInput): Promise<number> {
  const result = await db.runAsync(
    'INSERT INTO shoes (name, photo_uri, replace_km, initial_km) VALUES (?, ?, ?, ?)',
    [v.name, v.photoUri, v.replaceKm, v.initialKm],
  );
  return result.lastInsertRowId;
}

export async function updateShoe(db: SQLiteDatabase, id: number, v: ShoeInput): Promise<void> {
  await db.runAsync(
    'UPDATE shoes SET name = ?, photo_uri = ?, replace_km = ?, initial_km = ? WHERE id = ?',
    [v.name, v.photoUri, v.replaceKm, v.initialKm, id],
  );
}

export async function setShoeRetired(db: SQLiteDatabase, id: number, retired: boolean): Promise<void> {
  await db.runAsync('UPDATE shoes SET retired = ? WHERE id = ?', [retired ? 1 : 0, id]);
}

/** 신발을 지워도 러닝 기록은 남는다 (runs.shoe_id는 ON DELETE SET NULL) */
export async function deleteShoe(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM shoes WHERE id = ?', [id]);
}

/** 러닝 기록에 신은 신발을 정하거나 바꾼다 (null이면 선택 안 함) */
export async function setRunShoe(db: SQLiteDatabase, runId: number, shoeId: number | null): Promise<void> {
  await db.runAsync('UPDATE runs SET shoe_id = ? WHERE id = ?', [shoeId, runId]);
}

// ── 마지막으로 고른 신발 (다음 러닝의 기본값) ─────────────
const LAST_SHOE_KEY = 'last_shoe_id';

export async function getLastShoeId(db: SQLiteDatabase): Promise<number | null> {
  const row = await db.getFirstAsync<{ value: string | null }>('SELECT value FROM settings WHERE key = ?', [
    LAST_SHOE_KEY,
  ]);
  const id = row?.value ? Number(row.value) : NaN;
  return Number.isFinite(id) ? id : null;
}

export async function setLastShoeId(db: SQLiteDatabase, shoeId: number | null): Promise<void> {
  await db.runAsync(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT (key) DO UPDATE SET value = excluded.value`,
    [LAST_SHOE_KEY, shoeId === null ? null : String(shoeId)],
  );
}

import type { SQLiteDatabase } from 'expo-sqlite';

/** 인바디 기록 1건. 수치는 모두 선택 입력이라 비어 있을 수 있다(null). */
export type InbodyLog = {
  id: number;
  measuredOn: string; // YYYY-MM-DD
  heightCm: number | null;
  weightKg: number | null;
  bodyFatPct: number | null;
  skeletalMuscleKg: number | null;
  photoUri: string | null; // 결과지 사진 (기기 안에 복사해 둔 파일)
};

export type InbodyInput = Omit<InbodyLog, 'id'>;

type Row = {
  id: number;
  measured_on: string;
  height_cm: number | null;
  weight_kg: number | null;
  body_fat_pct: number | null;
  skeletal_muscle_kg: number | null;
  photo_uri: string | null;
};

const COLUMNS =
  'id, measured_on, height_cm, weight_kg, body_fat_pct, skeletal_muscle_kg, photo_uri';

function toLog(r: Row): InbodyLog {
  return {
    id: r.id,
    measuredOn: r.measured_on,
    heightCm: r.height_cm,
    weightKg: r.weight_kg,
    bodyFatPct: r.body_fat_pct,
    skeletalMuscleKg: r.skeletal_muscle_kg,
    photoUri: r.photo_uri,
  };
}

/** 최신 측정일이 먼저 오도록 정렬 */
export async function listInbody(db: SQLiteDatabase): Promise<InbodyLog[]> {
  const rows = await db.getAllAsync<Row>(
    `SELECT ${COLUMNS} FROM inbody_logs ORDER BY measured_on DESC, id DESC`,
  );
  return rows.map(toLog);
}

export async function getInbody(db: SQLiteDatabase, id: number): Promise<InbodyLog | null> {
  const row = await db.getFirstAsync<Row>(`SELECT ${COLUMNS} FROM inbody_logs WHERE id = ?`, [id]);
  return row ? toLog(row) : null;
}

export async function latestInbody(db: SQLiteDatabase): Promise<InbodyLog | null> {
  const row = await db.getFirstAsync<Row>(
    `SELECT ${COLUMNS} FROM inbody_logs ORDER BY measured_on DESC, id DESC LIMIT 1`,
  );
  return row ? toLog(row) : null;
}

export async function insertInbody(db: SQLiteDatabase, v: InbodyInput): Promise<number> {
  const result = await db.runAsync(
    `INSERT INTO inbody_logs (measured_on, height_cm, weight_kg, body_fat_pct, skeletal_muscle_kg, photo_uri)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [v.measuredOn, v.heightCm, v.weightKg, v.bodyFatPct, v.skeletalMuscleKg, v.photoUri],
  );
  return result.lastInsertRowId;
}

export async function updateInbody(db: SQLiteDatabase, id: number, v: InbodyInput): Promise<void> {
  await db.runAsync(
    `UPDATE inbody_logs
        SET measured_on = ?, height_cm = ?, weight_kg = ?, body_fat_pct = ?,
            skeletal_muscle_kg = ?, photo_uri = ?
      WHERE id = ?`,
    [v.measuredOn, v.heightCm, v.weightKg, v.bodyFatPct, v.skeletalMuscleKg, v.photoUri, id],
  );
}

export async function deleteInbody(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM inbody_logs WHERE id = ?', [id]);
}

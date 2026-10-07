import type { SQLiteDatabase } from 'expo-sqlite';

import type { MateTone } from '@/mate/types';

/** settings 테이블(키-값) 읽기·쓰기 */
export async function getSetting(db: SQLiteDatabase, key: string): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string | null }>('SELECT value FROM settings WHERE key = ?', [key]);
  return row?.value ?? null;
}

export async function setSetting(db: SQLiteDatabase, key: string, value: string | null): Promise<void> {
  await db.runAsync(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT (key) DO UPDATE SET value = excluded.value`,
    [key, value],
  );
}

// ── 러닝메이트 설정 ───────────────────────────────────
export const DEFAULT_MATE_NAME = '달리';

export type MateSettings = {
  name: string;
  tone: MateTone;
  voiceOn: boolean; // 음성 안내 켜기
};

export async function getMateSettings(db: SQLiteDatabase): Promise<MateSettings> {
  const [name, tone, voice] = await Promise.all([
    getSetting(db, 'mate_name'),
    getSetting(db, 'mate_tone'),
    getSetting(db, 'mate_voice'),
  ]);
  return {
    name: name?.trim() || DEFAULT_MATE_NAME,
    tone: tone === 'cheerful' ? 'cheerful' : 'gentle',
    voiceOn: voice !== 'off',
  };
}

export async function saveMateSettings(db: SQLiteDatabase, s: MateSettings): Promise<void> {
  await setSetting(db, 'mate_name', s.name.trim() || DEFAULT_MATE_NAME);
  await setSetting(db, 'mate_tone', s.tone);
  await setSetting(db, 'mate_voice', s.voiceOn ? 'on' : 'off');
}

// ── "오늘 컨디션이 안 좋아요" (그날 하루만 유지) ──────────
const UNWELL_KEY = 'unwell_on';

export async function isUnwellToday(db: SQLiteDatabase, todayKey: string): Promise<boolean> {
  return (await getSetting(db, UNWELL_KEY)) === todayKey;
}

export async function setUnwellToday(db: SQLiteDatabase, todayKey: string, on: boolean): Promise<void> {
  await setSetting(db, UNWELL_KEY, on ? todayKey : null);
}

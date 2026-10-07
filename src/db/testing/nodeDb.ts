/**
 * 단위 테스트 전용: 실제 SQLite(node:sqlite)에 마이그레이션을 적용한 DB.
 * expo-sqlite와 같은 모양의 함수만 흉내 낸 작은 어댑터다. 앱 코드에서는 쓰지 않는다.
 */
import type { SQLiteDatabase } from 'expo-sqlite';
import { DatabaseSync } from 'node:sqlite';

import { MIGRATIONS } from '../migrations';

type Params = (string | number | null)[];

export function makeTestDb(): SQLiteDatabase {
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


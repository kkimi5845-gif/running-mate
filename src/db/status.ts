import type { SQLiteDatabase } from 'expo-sqlite';

export type DbStatus = {
  version: number;
  tables: string[];
};

/** "내 정보" 화면에서 DB가 잘 만들어졌는지 확인하는 용도 */
export async function getDbStatus(db: SQLiteDatabase): Promise<DbStatus> {
  const versionRow = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const tableRows = await db.getAllAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
  );
  return {
    version: versionRow?.user_version ?? 0,
    tables: tableRows.map((r) => r.name),
  };
}

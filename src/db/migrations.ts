import type { SQLiteDatabase } from 'expo-sqlite';

/**
 * DB 마이그레이션 (테이블 생성·변경 이력)
 *
 * 규칙
 * - 이미 배포된 마이그레이션은 절대 고치지 않는다. 바꿀 게 생기면 아래 배열 끝에 새 항목을 추가한다.
 * - 현재 DB 버전은 SQLite의 `PRAGMA user_version`에 저장된다.
 * - 앱이 켜질 때 migrate()가 아직 적용 안 된 버전만 순서대로 실행한다.
 *
 * 모든 데이터는 기기 안의 SQLite 파일에만 저장되고, 서버로 보내지 않는다.
 */

type Migration = {
  version: number;
  description: string;
  sql: string;
};

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    description: '기본 테이블 생성 (프로필, 인바디, 신발, 러닝, 경로 좌표, 설정)',
    sql: `
      -- 온보딩 답변으로 만든 프로필. 사용자는 한 명뿐이라 id는 항상 1.
      CREATE TABLE profile (
        id                   INTEGER PRIMARY KEY CHECK (id = 1),
        experience           TEXT,    -- none | under_6m | 6m_2y | over_2y
        continuous_run       TEXT,    -- hard | 5min | 10_20min | 30min_plus
        goal                 TEXT,    -- health | habit | 5k | 10k_plus
        sessions_per_week    INTEGER,
        minutes_per_session  INTEGER,
        has_discomfort       INTEGER NOT NULL DEFAULT 0,  -- 0: 없음, 1: 있음
        discomfort_areas     TEXT,    -- 예: '["knee","ankle"]' (JSON 배열)
        created_at           TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at           TEXT NOT NULL DEFAULT (datetime('now'))
      );

      -- 인바디·건강 정보. 날짜별로 쌓아 변화 추이를 본다. 모든 수치는 선택 입력.
      CREATE TABLE inbody_logs (
        id                   INTEGER PRIMARY KEY AUTOINCREMENT,
        measured_on          TEXT NOT NULL,  -- YYYY-MM-DD
        height_cm            REAL,
        weight_kg            REAL,
        body_fat_pct         REAL,
        skeletal_muscle_kg   REAL,
        created_at           TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX idx_inbody_measured_on ON inbody_logs (measured_on);

      -- 신발. 누적 거리는 runs에서 합산해 계산한다(따로 저장하지 않아 숫자가 어긋나지 않음).
      CREATE TABLE shoes (
        id                   INTEGER PRIMARY KEY AUTOINCREMENT,
        name                 TEXT NOT NULL,           -- 브랜드·모델
        photo_uri            TEXT,
        replace_km           REAL NOT NULL DEFAULT 600, -- 교체 권장 거리
        retired              INTEGER NOT NULL DEFAULT 0, -- 1이면 목록에서 숨김(기록은 보존)
        created_at           TEXT NOT NULL DEFAULT (datetime('now'))
      );

      -- 러닝 1회 기록. 신발 연결은 runs.shoe_id.
      CREATE TABLE runs (
        id                   INTEGER PRIMARY KEY AUTOINCREMENT,
        status               TEXT NOT NULL DEFAULT 'recording', -- recording | paused | finished
        started_at           TEXT NOT NULL,
        ended_at             TEXT,
        duration_sec         INTEGER NOT NULL DEFAULT 0,  -- 일시정지 시간을 뺀 실제 달린 시간
        distance_m           REAL NOT NULL DEFAULT 0,     -- 걸러낸 좌표로 계산한 거리
        shoe_id              INTEGER REFERENCES shoes (id) ON DELETE SET NULL,
        memo                 TEXT,
        created_at           TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX idx_runs_started_at ON runs (started_at);
      CREATE INDEX idx_runs_shoe_id ON runs (shoe_id);

      -- 러닝 경로 좌표. 원본은 그대로 보존하고, 거리 계산에 쓸지 여부만 표시한다.
      CREATE TABLE run_points (
        id                   INTEGER PRIMARY KEY AUTOINCREMENT,
        run_id               INTEGER NOT NULL REFERENCES runs (id) ON DELETE CASCADE,
        recorded_at          INTEGER NOT NULL,  -- 밀리초 타임스탬프
        latitude             REAL NOT NULL,
        longitude            REAL NOT NULL,
        altitude             REAL,
        accuracy             REAL,              -- 정확도 오차(m)
        speed                REAL,              -- m/s
        used_for_distance    INTEGER NOT NULL DEFAULT 1  -- 0이면 정확도·속도 문제로 거리 계산에서 제외
      );
      CREATE INDEX idx_run_points_run ON run_points (run_id, recorded_at);

      -- 앱 설정 (러닝메이트 이름·말투, 마지막 선택 신발 등). 키-값 형태.
      CREATE TABLE settings (
        key                  TEXT PRIMARY KEY NOT NULL,
        value                TEXT
      );
    `,
  },
  {
    version: 2,
    description: '인바디 결과지 사진 첨부',
    sql: `
      ALTER TABLE inbody_logs ADD COLUMN photo_uri TEXT;
    `,
  },
  {
    version: 3,
    description: '러닝 일시정지·재개 시간 계산용 컬럼',
    sql: `
      -- 지금 달리는 구간이 시작된 시각(밀리초). 일시정지 중이거나 끝난 기록은 NULL.
      -- 경과 시간 = duration_sec + (지금 - active_since)
      ALTER TABLE runs ADD COLUMN active_since INTEGER;
    `,
  },
  {
    version: 4,
    description: '거리 계산에서 뺀 좌표의 이유 기록 (accuracy | speed | duplicate)',
    sql: `
      ALTER TABLE run_points ADD COLUMN exclude_reason TEXT;
    `,
  },
  {
    version: 5,
    description: '신발 등록 전에 이미 신고 달린 거리',
    sql: `
      ALTER TABLE shoes ADD COLUMN initial_km REAL NOT NULL DEFAULT 0;
    `,
  },
  {
    version: 6,
    description: '러닝을 시작할 때 고른 운동 계획(음성 코칭용, JSON). 자유 러닝이면 NULL',
    sql: `
      ALTER TABLE runs ADD COLUMN plan_json TEXT;
    `,
  },
  {
    version: 7,
    description: '러닝 배경음악 목록 (내 휴대폰의 음악 파일을 앱 폴더에 복사해 둔 것)',
    sql: `
      CREATE TABLE music_tracks (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        kind        TEXT NOT NULL,   -- walk(걷기 구간) | run(달리기 구간)
        name        TEXT NOT NULL,   -- 화면에 보여줄 파일 이름
        uri         TEXT NOT NULL,   -- 앱 폴더 안의 파일 위치
        created_at  TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `,
  },
];

export const LATEST_DB_VERSION = MIGRATIONS[MIGRATIONS.length - 1].version;

/** SQLiteProvider의 onInit에서 호출된다. 앱이 켜질 때마다 실행되지만, 필요한 것만 적용한다. */
export async function migrate(db: SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const current = row?.user_version ?? 0;

  for (const m of MIGRATIONS) {
    if (m.version <= current) continue;
    // 한 버전은 통째로 성공하거나 통째로 취소된다(중간에 실패해도 DB가 반쯤 바뀌지 않음).
    await db.withExclusiveTransactionAsync(async (txn) => {
      await txn.execAsync(m.sql);
      await txn.execAsync(`PRAGMA user_version = ${m.version}`);
    });
  }
}

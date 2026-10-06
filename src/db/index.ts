/** 기기 안에 만들어지는 SQLite 파일 이름 */
export const DATABASE_NAME = 'running-mate.db';

export { LATEST_DB_VERSION, migrate } from './migrations';
export { getDbStatus, type DbStatus } from './status';

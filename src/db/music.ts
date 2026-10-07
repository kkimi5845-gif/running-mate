import type { SQLiteDatabase } from 'expo-sqlite';

import type { MusicKind, Track } from '@/music/select';

export async function listTracks(db: SQLiteDatabase): Promise<Track[]> {
  return db.getAllAsync<Track>('SELECT id, kind, name, uri FROM music_tracks ORDER BY kind, id');
}

export async function addTrack(db: SQLiteDatabase, kind: MusicKind, name: string, uri: string): Promise<void> {
  await db.runAsync('INSERT INTO music_tracks (kind, name, uri) VALUES (?, ?, ?)', [kind, name, uri]);
}

export async function deleteTrack(db: SQLiteDatabase, id: number): Promise<void> {
  await db.runAsync('DELETE FROM music_tracks WHERE id = ?', [id]);
}

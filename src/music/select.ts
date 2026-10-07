/** 배경음악 고르기 (순수 함수 — 단위 테스트 대상) */

export type MusicKind = 'walk' | 'run';
export type Track = { id: number; kind: MusicKind; name: string; uri: string };

/**
 * 구간에 맞는 곡 목록. 한쪽 목록이 비어 있으면 다른 쪽 목록을 대신 쓴다
 * (걷기 음악만 넣었어도 달리기 구간에 음악이 끊기지 않게).
 */
export function playlistFor(kind: MusicKind, tracks: Track[]): Track[] {
  const same = tracks.filter((t) => t.kind === kind);
  return same.length > 0 ? same : tracks;
}

/** 목록에서 다음 곡 위치 (끝나면 처음으로) */
export function nextIndex(current: number, length: number): number {
  if (length <= 0) return -1;
  return (current + 1) % length;
}

/** 확장자를 뺀 보기 좋은 이름 */
export function displayName(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, '').trim() || '이름 없는 곡';
}

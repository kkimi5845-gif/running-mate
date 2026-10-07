import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

import { nextIndex, playlistFor, type MusicKind, type Track } from './select';

/**
 * 러닝 배경음악 재생.
 * - 걷기 구간은 걷기 음악, 달리기 구간은 달리기 음악을 튼다 (음성 코칭이 구간이 바뀔 때 switchMusic을 부른다).
 * - 안내 음성이 나오는 동안에는 소리를 줄인다(duckMusic).
 * - 곡이 끝나면 같은 목록의 다음 곡을 튼다.
 */
const NORMAL_VOLUME = 1;
const DUCKED_VOLUME = 0.25;

let player: AudioPlayer | null = null;
let tracks: Track[] = [];
let kind: MusicKind = 'walk';
let index = -1;
let paused = false;

async function ensurePlayer(): Promise<AudioPlayer> {
  if (player) return player;
  await setAudioModeAsync({
    playsInSilentMode: true,
    shouldPlayInBackground: true, // 개발용 빌드에서 화면이 꺼져도 재생
    interruptionMode: 'duckOthers',
  });
  player = createAudioPlayer(null);
  player.addListener('playbackStatusUpdate', (status) => {
    if (status.didJustFinish) playNext();
  });
  return player;
}

function playAt(i: number) {
  const list = playlistFor(kind, tracks);
  if (!player || list.length === 0 || i < 0) return;
  index = i % list.length;
  player.replace({ uri: list[index].uri });
  player.volume = NORMAL_VOLUME;
  if (!paused) player.play();
}

function playNext() {
  playAt(nextIndex(index, playlistFor(kind, tracks).length));
}

/** 러닝 시작 때: 곡 목록과 첫 구간 종류를 받아 재생 시작 */
export async function startMusic(allTracks: Track[], firstKind: MusicKind): Promise<void> {
  if (allTracks.length === 0) return;
  await ensurePlayer();
  tracks = allTracks;
  kind = firstKind;
  paused = false;
  playAt(0);
}

export function isMusicActive(): boolean {
  return player !== null && tracks.length > 0;
}

/** 구간이 바뀔 때: 종류가 달라지면 그 종류의 곡으로 바꾼다 */
export function switchMusic(next: MusicKind): void {
  if (!isMusicActive() || next === kind) return;
  kind = next;
  playAt(0);
}

export function pauseMusic(): void {
  paused = true;
  player?.pause();
}

export function resumeMusic(): void {
  paused = false;
  if (isMusicActive()) player?.play();
}

/** 안내 음성이 나오는 동안 소리 줄이기 */
export function duckMusic(on: boolean): void {
  if (player) player.volume = on ? DUCKED_VOLUME : NORMAL_VOLUME;
}

export function stopMusic(): void {
  player?.pause();
  player?.remove();
  player = null;
  tracks = [];
  index = -1;
  paused = false;
}

/** 설정 화면 미리 듣기용 (한 곡만) */
export async function previewTrack(uri: string | null): Promise<void> {
  const p = await ensurePlayer();
  tracks = [];
  if (!uri) {
    p.pause();
    return;
  }
  p.replace({ uri });
  p.volume = NORMAL_VOLUME;
  p.play();
}

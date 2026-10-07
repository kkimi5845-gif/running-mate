import { Directory, File, Paths } from 'expo-file-system';

import { displayName } from './select';

/**
 * 내 휴대폰의 음악 파일을 골라 앱 전용 폴더(document/music)로 복사한다.
 * 원본을 옮기거나 지워도 앱에서 계속 재생되고, 파일이 밖으로 나가지 않는다.
 */
function musicDir(): Directory {
  const dir = new Directory(Paths.document, 'music');
  if (!dir.exists) dir.create();
  return dir;
}

export async function pickMusicFiles(): Promise<{ name: string; uri: string }[]> {
  // 파일 시스템 부품의 자체 고르기 창을 쓴다: 고른 파일을 읽을 권한까지 함께 받아 와서 복사할 수 있다.
  const picked = await File.pickFileAsync({ mimeTypes: 'audio/*', multipleFiles: true });
  if (picked.canceled) return [];
  return picked.result.map((file, i) => {
    const name = file.name || `music-${i}.mp3`;
    const ext = name.includes('.') ? name.split('.').pop()!.toLowerCase() : 'mp3';
    const saved = new File(musicDir(), `music-${Date.now()}-${i}.${ext}`);
    file.copySync(saved);
    return { name: displayName(name), uri: saved.uri };
  });
}

export function deleteMusicFile(uri: string): void {
  if (!uri.startsWith(musicDir().uri)) return;
  try {
    const f = new File(uri);
    if (f.exists) f.delete();
  } catch {
    // 이미 없으면 무시
  }
}

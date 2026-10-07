import * as DocumentPicker from 'expo-document-picker';
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
  const result = await DocumentPicker.getDocumentAsync({ type: 'audio/*', multiple: true, copyToCacheDirectory: true });
  if (result.canceled) return [];
  return result.assets.map((a, i) => {
    const ext = a.name.split('.').pop()?.toLowerCase() || 'mp3';
    const saved = new File(musicDir(), `music-${Date.now()}-${i}.${ext}`);
    new File(a.uri).copySync(saved);
    return { name: displayName(a.name), uri: saved.uri };
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

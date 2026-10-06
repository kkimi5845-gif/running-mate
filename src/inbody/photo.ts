import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

/**
 * 인바디 결과지 사진 다루기.
 * 고른 사진은 앱 전용 폴더(document/inbody)로 복사해 둔다.
 * 그래야 갤러리에서 원본을 지워도 기록의 사진이 남고, 사진이 외부로 나가지도 않는다.
 */

export type PickSource = 'camera' | 'library';

export type PickResult =
  | { ok: true; uri: string }
  | { ok: false; reason: 'cancelled' | 'denied' };

function photoDir(): Directory {
  const dir = new Directory(Paths.document, 'inbody');
  if (!dir.exists) dir.create();
  return dir;
}

export async function pickInbodyPhoto(source: PickSource): Promise<PickResult> {
  const permission =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return { ok: false, reason: 'denied' };

  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.8 };
  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled || result.assets.length === 0) return { ok: false, reason: 'cancelled' };

  const picked = new File(result.assets[0].uri);
  const ext = picked.uri.split('.').pop()?.toLowerCase() || 'jpg';
  const saved = new File(photoDir(), `inbody-${Date.now()}.${ext}`);
  picked.copySync(saved);
  return { ok: true, uri: saved.uri };
}

/** 기록을 지우거나 사진을 바꿀 때 기존 파일도 정리한다. 앱 폴더 밖의 파일은 건드리지 않는다. */
export function deleteInbodyPhoto(uri: string | null): void {
  if (!uri || !uri.startsWith(photoDir().uri)) return;
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // 이미 없어진 파일이면 무시
  }
}

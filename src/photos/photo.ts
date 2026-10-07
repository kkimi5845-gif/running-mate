import { Directory, File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';

/**
 * 사진 첨부 (인바디 결과지, 신발 사진).
 * 고른 사진은 앱 전용 폴더(document/<folder>)로 복사해 둔다.
 * 그래야 갤러리에서 원본을 지워도 기록의 사진이 남고, 사진이 외부로 나가지도 않는다.
 */

export type PhotoFolder = 'inbody' | 'shoes';
export type PickSource = 'camera' | 'library';

export type PickResult =
  | { ok: true; uri: string }
  | { ok: false; reason: 'cancelled' | 'denied' };

function photoDir(folder: PhotoFolder): Directory {
  const dir = new Directory(Paths.document, folder);
  if (!dir.exists) dir.create();
  return dir;
}

export async function pickPhoto(folder: PhotoFolder, source: PickSource): Promise<PickResult> {
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
  const saved = new File(photoDir(folder), `${folder}-${Date.now()}.${ext}`);
  picked.copySync(saved);
  return { ok: true, uri: saved.uri };
}

/** 사진을 바꾸거나 기록을 지울 때 파일도 정리한다. 앱 폴더 밖의 파일은 건드리지 않는다. */
export function deletePhoto(folder: PhotoFolder, uri: string | null): void {
  if (!uri || !uri.startsWith(photoDir(folder).uri)) return;
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch {
    // 이미 없어진 파일이면 무시
  }
}

/** 권한이 없을 때 보여줄 안내 문구 */
export function permissionMessage(source: PickSource): string {
  return source === 'camera'
    ? '휴대폰 설정에서 카메라 사용을 허용해 주세요.'
    : '휴대폰 설정에서 사진 접근을 허용해 주세요.';
}

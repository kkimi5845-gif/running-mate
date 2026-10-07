import * as Location from 'expo-location';

/**
 * 가까운 제주 코스를 고르기 위한 지금 위치. 휴대폰 안에서만 쓰고 저장하거나 보내지 않는다.
 * ask가 false면 이미 허용된 경우에만 최근 위치를 빠르게 가져온다 (권한 창을 띄우지 않음).
 */
export async function getHere(ask: boolean): Promise<{ lat: number; lng: number } | null> {
  try {
    const perm = ask
      ? await Location.requestForegroundPermissionsAsync()
      : await Location.getForegroundPermissionsAsync();
    if (!perm.granted) return null;
    const last = await Location.getLastKnownPositionAsync({ maxAge: 30 * 60 * 1000 });
    const pos = last ?? (ask ? await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }) : null);
    return pos ? { lat: pos.coords.latitude, lng: pos.coords.longitude } : null;
  } catch {
    return null;
  }
}

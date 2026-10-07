import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Location from 'expo-location';
import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';
import * as TaskManager from 'expo-task-manager';

import { coachTick } from '@/coach/coach';
import { DATABASE_NAME } from '@/db';
import { ingestLocations, type IncomingLocation } from '@/db/runs';
import { colors } from '@/theme';

/**
 * GPS 위치 기록 시작·중지.
 *
 * 두 가지 방식이 있다.
 * - background: 화면이 꺼지거나 다른 앱을 써도 기록이 이어진다. (개발용 빌드·실제 앱)
 *   안드로이드는 알림창에 "기록 중" 알림을 띄우는 포그라운드 서비스로 동작한다.
 * - foreground: 앱 화면이 켜져 있을 때만 기록된다. (Expo Go — 백그라운드 기능을 지원하지 않음)
 *
 * 어느 방식이든 받은 좌표는 ingestLocations()로 DB에 바로 저장한다.
 * 그래서 앱이 강제로 꺼져도 그때까지의 기록은 남는다.
 */

export const LOCATION_TASK = 'running-mate-location';

export type TrackingMode = 'background' | 'foreground';

export type StartResult =
  | { ok: true; mode: TrackingMode }
  | { ok: false; reason: 'permission-denied' | 'location-off' };

/** Expo Go에서는 백그라운드 위치 기록을 쓸 수 없다 */
export const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// ── DB 연결 ──────────────────────────────────────────────
// 백그라운드 작업은 화면(React) 밖에서 실행되므로 DB를 따로 연다.
let dbPromise: Promise<SQLiteDatabase> | null = null;
function getDb(): Promise<SQLiteDatabase> {
  dbPromise ??= openDatabaseAsync(DATABASE_NAME);
  return dbPromise;
}

// 좌표 저장이 겹치지 않도록 한 번에 하나씩 순서대로 처리한다.
let queue: Promise<void> = Promise.resolve();
function enqueue(locations: IncomingLocation[]): Promise<void> {
  queue = queue
    .then(async () => ingestLocations(await getDb(), locations))
    .catch((e) => console.warn('[tracking] 좌표 저장 실패', e));
  return queue;
}

const toIncoming = (l: Location.LocationObject): IncomingLocation => ({
  timestamp: l.timestamp,
  coords: {
    latitude: l.coords.latitude,
    longitude: l.coords.longitude,
    altitude: l.coords.altitude,
    accuracy: l.coords.accuracy,
    speed: l.coords.speed,
  },
});

// ── 백그라운드 작업 등록 ─────────────────────────────────
// 반드시 앱이 시작될 때(모듈 최상단에서) 등록해야 한다. 그래야 앱이 백그라운드에서 다시 깨어나도 동작한다.
if (!isExpoGo) {
  TaskManager.defineTask<{ locations: Location.LocationObject[] }>(LOCATION_TASK, async ({ data, error }) => {
    if (error) {
      console.warn('[tracking] 백그라운드 위치 오류', error.message);
      return;
    }
    if (data?.locations?.length) {
      await enqueue(data.locations.map(toIncoming));
      // 화면이 꺼져 있어도 좌표가 들어올 때마다 음성 안내 시점을 확인한다
      await coachTick(await getDb());
    }
  });
}

const TRACKING_OPTIONS: Location.LocationTaskOptions = {
  accuracy: Location.Accuracy.BestForNavigation,
  timeInterval: 1000,
  distanceInterval: 2,
  activityType: Location.LocationActivityType.Fitness,
  pausesUpdatesAutomatically: false,
  showsBackgroundLocationIndicator: true,
  foregroundService: {
    notificationTitle: '러닝메이트가 기록 중이에요',
    notificationBody: '화면을 꺼도 거리와 시간이 계속 기록돼요.',
    notificationColor: colors.primary,
  },
};

let watchSub: Location.LocationSubscription | null = null;

/** 현재 기록 방식. 기록 중이 아니면 null */
export async function currentTrackingMode(): Promise<TrackingMode | null> {
  if (watchSub) return 'foreground';
  if (!isExpoGo && (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK).catch(() => false))) {
    return 'background';
  }
  return null;
}

/**
 * 위치 기록을 시작한다. 이미 켜져 있으면 그대로 둔다.
 * 권한 요청 전에 화면에서 왜 필요한지 먼저 설명해 두는 것이 좋다.
 */
export async function startTracking(): Promise<StartResult> {
  const servicesOn = await Location.hasServicesEnabledAsync();
  if (!servicesOn) return { ok: false, reason: 'location-off' };

  const fg = await Location.requestForegroundPermissionsAsync();
  if (!fg.granted) return { ok: false, reason: 'permission-denied' };

  const already = await currentTrackingMode();
  if (already) return { ok: true, mode: already };

  if (!isExpoGo) {
    // "항상 허용"을 받아야 화면이 꺼져도 기록된다. 거절해도 화면이 켜져 있을 때는 기록할 수 있다.
    const bg = await Location.requestBackgroundPermissionsAsync().catch(() => ({ granted: false }));
    if (bg.granted) {
      await Location.startLocationUpdatesAsync(LOCATION_TASK, TRACKING_OPTIONS);
      return { ok: true, mode: 'background' };
    }
  }

  watchSub = await Location.watchPositionAsync(
    { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 2 },
    (loc) => {
      void enqueue([toIncoming(loc)]);
    },
  );
  return { ok: true, mode: 'foreground' };
}

/** 위치 기록을 멈추고, 아직 저장 중인 좌표가 있으면 끝날 때까지 기다린다. */
export async function stopTracking(): Promise<void> {
  watchSub?.remove();
  watchSub = null;
  if (!isExpoGo && (await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK).catch(() => false))) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK);
  }
  await queue;
}

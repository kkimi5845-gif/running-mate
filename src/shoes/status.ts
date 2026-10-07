/** 신발 교체 시점 판단 (순수 함수 — 단위 테스트 대상) */

export const DEFAULT_REPLACE_KM = 600;
/** 교체 권장 거리의 이 비율에 도달하면 "교체 준비" */
export const READY_RATIO = 0.8;

export type ShoeStatus = 'ok' | 'ready' | 'replace';

export function shoeStatus(totalKm: number, replaceKm: number): ShoeStatus {
  if (replaceKm <= 0) return 'ok';
  const ratio = totalKm / replaceKm;
  if (ratio >= 1) return 'replace';
  if (ratio >= READY_RATIO) return 'ready';
  return 'ok';
}

/** 0~1 사이로 자른 진행 비율 (막대 그래프용) */
export function wearRatio(totalKm: number, replaceKm: number): number {
  if (replaceKm <= 0) return 0;
  return Math.min(1, Math.max(0, totalKm / replaceKm));
}

export const STATUS_LABEL: Record<ShoeStatus, string> = {
  ok: '좋아요',
  ready: '교체 준비',
  replace: '교체 권장',
};

/** 상태 안내 문구. 신발에 대한 안내일 뿐, 몸 상태를 판단하지 않는다. */
export function statusMessage(status: ShoeStatus, remainingKm: number): string | null {
  if (status === 'replace') return '권장 거리를 넘었어요. 새 신발로 바꿀 때가 됐어요.';
  if (status === 'ready') return `권장 거리까지 ${Math.max(0, Math.round(remainingKm))}km 남았어요. 새 신발을 미리 준비해 두세요.`;
  return null;
}

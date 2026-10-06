/** 화면 표시용 숫자 형식 (순수 함수) */

/** 미터 → '3.21' (km, 소수 둘째 자리) */
export function formatKm(meters: number): string {
  return (Math.floor(meters / 10) / 100).toFixed(2);
}

/** 초 → '32:10' 또는 '1:02:03' */
export function formatDuration(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(h > 0 ? 2 : 1, '0');
  const ss = String(sec).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** 초/km → "6'30\"" , 없으면 "-'--\"" */
export function formatPace(secPerKm: number | null): string {
  if (secPerKm === null || !Number.isFinite(secPerKm) || secPerKm >= 60 * 60) return `-'--"`;
  const total = Math.round(secPerKm);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}'${String(s).padStart(2, '0')}"`;
}

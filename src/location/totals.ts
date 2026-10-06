/** 러닝 합산 (오늘 / 이번 주 / 이번 달) — 순수 함수 */

export type RunForTotals = { startedAt: string; distanceM: number }; // startedAt: ISO 문자열

export type Totals = { todayM: number; weekM: number; monthM: number };

/** 그 주 월요일 0시 (휴대폰 시간대 기준) */
export function startOfWeek(now: Date): Date {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = d.getDay(); // 0=일 … 6=토
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  return d;
}

export function computeTotals(runs: RunForTotals[], now: Date): Totals {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const week = startOfWeek(now).getTime();
  const month = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  const totals: Totals = { todayM: 0, weekM: 0, monthM: 0 };
  for (const r of runs) {
    const t = new Date(r.startedAt).getTime();
    if (t >= today) totals.todayM += r.distanceM;
    if (t >= week) totals.weekM += r.distanceM;
    if (t >= month) totals.monthM += r.distanceM;
  }
  return totals;
}

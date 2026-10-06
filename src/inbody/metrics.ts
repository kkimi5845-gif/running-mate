import type { InbodyLog } from '@/db/inbody';

/** 인바디 입력 항목. 입력 범위는 오타를 거르는 용도일 뿐, 건강 상태를 판정하지 않는다. */
export const METRICS = [
  { key: 'heightCm', label: '키', unit: 'cm', min: 50, max: 250 },
  { key: 'weightKg', label: '체중', unit: 'kg', min: 20, max: 300 },
  { key: 'bodyFatPct', label: '체지방률', unit: '%', min: 1, max: 75 },
  { key: 'skeletalMuscleKg', label: '골격근량', unit: 'kg', min: 5, max: 100 },
] as const;

export type MetricKey = (typeof METRICS)[number]['key'];
export type Metric = (typeof METRICS)[number];

/** 그래프로 보여줄 항목 (키는 거의 변하지 않아 제외) */
export const CHART_METRICS = METRICS.filter((m) => m.key !== 'heightCm');

export function formatValue(value: number | null, unit: string): string {
  if (value === null) return '-';
  return `${Number.isInteger(value) ? value : value.toFixed(1)}${unit}`;
}

/** 입력칸 글자 → 숫자. 쉼표도 소수점으로 받아준다. 비어 있으면 null, 숫자가 아니면 NaN */
export function parseNumber(text: string): number | null {
  const t = text.trim().replace(',', '.');
  if (t === '') return null;
  return /^\d+(\.\d+)?$/.test(t) ? Number(t) : NaN;
}

export function valueOf(log: InbodyLog, key: MetricKey): number | null {
  return log[key];
}

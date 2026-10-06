/**
 * 온보딩 질문과 선택지. 화면 문구와 DB에 저장되는 값(value)을 한 곳에서 관리한다.
 * value는 DB에 저장되므로 한 번 정하면 바꾸지 않는다. 화면 문구(label)는 자유롭게 고쳐도 된다.
 */

export type Choice<T extends string | number> = { value: T; label: string; hint?: string };

export const EXPERIENCE = [
  { value: 'none', label: '처음이에요' },
  { value: 'under_6m', label: '6개월 미만' },
  { value: '6m_2y', label: '6개월 ~ 2년' },
  { value: 'over_2y', label: '2년 이상' },
] as const satisfies readonly Choice<string>[];

export const CONTINUOUS_RUN = [
  { value: 'hard', label: '달리기가 어려워요' },
  { value: '5min', label: '5분 정도' },
  { value: '10_20min', label: '10~20분' },
  { value: '30min_plus', label: '30분 이상' },
  { value: '60min_plus', label: '1시간 이상' },
] as const satisfies readonly Choice<string>[];

export const GOAL = [
  { value: 'health', label: '건강·체중 관리' },
  { value: 'habit', label: '꾸준한 습관 만들기' },
  { value: '5k', label: '5km 완주' },
  { value: '10k_plus', label: '10km 이상 달리기' },
] as const satisfies readonly Choice<string>[];

export const SESSIONS_PER_WEEK = [1, 2, 3, 4, 5, 6, 7].map((n) => ({
  value: n,
  label: `${n}회`,
})) satisfies Choice<number>[];

export const MINUTES_PER_SESSION = [
  { value: 20, label: '20분' },
  { value: 30, label: '30분' },
  { value: 45, label: '45분' },
  { value: 60, label: '60분 이상' },
] as const satisfies readonly Choice<number>[];

export const DISCOMFORT_AREAS = [
  { value: 'knee', label: '무릎' },
  { value: 'ankle', label: '발목' },
  { value: 'back', label: '허리' },
  { value: 'other', label: '기타' },
] as const satisfies readonly Choice<string>[];

export type Experience = (typeof EXPERIENCE)[number]['value'];
export type ContinuousRun = (typeof CONTINUOUS_RUN)[number]['value'];
export type Goal = (typeof GOAL)[number]['value'];
export type DiscomfortArea = (typeof DISCOMFORT_AREAS)[number]['value'];

export type Profile = {
  experience: Experience;
  continuousRun: ContinuousRun;
  goal: Goal;
  sessionsPerWeek: number;
  minutesPerSession: number;
  hasDiscomfort: boolean;
  discomfortAreas: DiscomfortArea[];
};

/** 저장된 값에 맞는 화면 문구를 찾는다. 모르는 값이면 '-' */
export function labelOf<T extends string | number>(
  choices: readonly Choice<T>[],
  value: T | null | undefined,
): string {
  return choices.find((c) => c.value === value)?.label ?? '-';
}

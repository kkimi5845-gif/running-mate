/**
 * 추천 규칙 모음 — 숫자나 문구를 바꾸고 싶으면 이 파일만 고치면 된다.
 *
 * 원칙
 * - 건강 상태를 판정하지 않는다. 인바디 수치는 "걷기 비중을 늘릴지"에만 보수적으로 쓴다.
 * - 애매하면 강도를 낮추는 쪽을 고른다.
 */
import type { ContinuousRun } from '@/profile/options';

import type { Intensity, ReasonCode, Segment } from './types';

// ── 1. 단계표 ─────────────────────────────────────────
// 아래로 갈수록 달리기 비중이 커진다. kind가 'intervals'면 한 세트(달리기+걷기)를 반복하고,
// 'continuous'면 쉬지 않고 정해진 시간 동안 달린다.
export type LadderStep =
  | { kind: 'intervals'; runMin: number; walkMin: number; intensity: Intensity }
  | { kind: 'continuous'; runMin: number; intensity: Intensity };

export const LADDER: LadderStep[] = [
  { kind: 'intervals', runMin: 1, walkMin: 2, intensity: 'very_easy' }, // 0: 걷기 위주
  { kind: 'intervals', runMin: 2, walkMin: 2, intensity: 'easy' }, // 1
  { kind: 'intervals', runMin: 3, walkMin: 2, intensity: 'easy' }, // 2
  { kind: 'intervals', runMin: 5, walkMin: 2, intensity: 'easy' }, // 3
  { kind: 'intervals', runMin: 8, walkMin: 2, intensity: 'easy' }, // 4
  { kind: 'intervals', runMin: 10, walkMin: 1, intensity: 'easy' }, // 5
  { kind: 'continuous', runMin: 20, intensity: 'easy' }, // 6
  { kind: 'continuous', runMin: 30, intensity: 'easy' }, // 7
  { kind: 'continuous', runMin: 45, intensity: 'moderate' }, // 8
];

/** "지금 쉬지 않고 달릴 수 있는 시간" 답에 따른 시작 단계 */
export const START_LEVEL: Record<ContinuousRun, number> = {
  hard: 0, // 달리기 어려움 → 걷기 위주 + 짧은 달리기
  '5min': 1, // 5~10분 → 달리기 구간을 늘려 가는 교차 구성
  '10_20min': 3,
  '30min_plus': 7, // 30분 이상 → 지속 달리기
  '60min_plus': 8,
};
/** 러닝이 처음이면 달릴 수 있는 시간과 상관없이 이 단계부터 */
export const FIRST_TIMER_LEVEL = 0;

// ── 2. 꾸준함에 따른 단계 올리기 ──────────────────────
/** 최근 2주에 이만큼 달릴 때마다 한 단계 올린다 */
export const SESSIONS_PER_STEP_UP = 3;
/** 최근 기록만으로 올릴 수 있는 최대 단계 수 (더 올리려면 프로필의 "달릴 수 있는 시간"을 고친다) */
export const MAX_STEP_UPS = 2;

// ── 3. 휴식·증량 제한 ─────────────────────────────────
/** 이 날수만큼 연속으로 달렸으면 오늘은 휴식 */
export const REST_AFTER_CONSECUTIVE_DAYS = 3;
/** 최근 7일 거리가 그 전 7일보다 이 비율을 넘으면 이번 주는 증량하지 않음 (1.3 = 30% 증가) */
export const WEEKLY_JUMP_RATIO = 1.3;

// ── 4. 몸 상태 정보 (보수적으로만 사용) ────────────────
// 관절 부담이 클 수 있는 경우 걷기 비중을 늘린다. 판정이 아니라 "조심하는 쪽"으로 기울이는 기준이다.
/** 체질량지수(체중kg ÷ 키m²)가 이 값 이상이면 */
export const BMI_MORE_WALK = 27.5;
/** 체지방률이 이 값 이상이면 (성별 정보가 없어 높은 쪽 기준을 쓴다) */
export const BODY_FAT_MORE_WALK = 35;
/** 걷기 비중을 늘릴 때 세트마다 더하는 걷기 시간(분) */
export const EXTRA_WALK_MIN = 1;
/** 지속 달리기 단계에서 걷기 비중을 늘릴 때: 이 시간 달리고 1분 걷기 */
export const CONTINUOUS_BREAK_EVERY_MIN = 9;

// ── 5. 시간 구성 ──────────────────────────────────────
/** 1회 운동 시간이 이보다 짧으면 준비·마무리 걷기를 3분으로 줄인다 */
export const SHORT_SESSION_MIN = 25;
export const WARMUP_MIN = 5;
export const COOLDOWN_MIN = 5;
export const SHORT_WARMUP_MIN = 3;
export const SHORT_COOLDOWN_MIN = 3;
/** 반복 세트 최대 */
export const MAX_REPEAT = 10;
/** 이보다 짧은 기록(시험 삼아 누른 기록 등)은 추천 계산에서 뺀다 (m) */
export const MIN_COUNTED_RUN_M = 300;

// ── 6. 화면 문구 ──────────────────────────────────────
export const INTENSITY_LABEL: Record<Intensity, { title: string; hint: string }> = {
  very_easy: { title: '아주 편하게', hint: '숨이 차지 않을 만큼 천천히' },
  easy: { title: '편하게', hint: '옆 사람과 대화할 수 있는 속도' },
  moderate: { title: '조금 힘있게', hint: '약간 숨이 차지만 말은 할 수 있는 속도' },
};

export function segmentLabel(s: Segment): string {
  return `${s.kind === 'run' ? '달리기' : '걷기'} ${s.minutes}분`;
}

/** 추천 이유 기본 문구. 6단계 러닝메이트가 말투에 맞게 바꿔 말한다. */
export const REASON_TEXT: Record<ReasonCode, (ctx: { sessionsPerWeek: number }) => string> = {
  BASE_WALK_MOSTLY: () => '걷기 위주로, 짧게 달리기를 섞어요.',
  BASE_INTERVALS: () => '달리기와 걷기를 번갈아 하며 달리는 시간을 조금씩 늘려요.',
  BASE_CONTINUOUS: () => '편한 속도로 이어서 달려요.',
  PROGRESS_UP: () => '최근 꾸준히 달려서 달리는 시간을 조금 늘렸어요.',
  WEEKLY_JUMP_HOLD: () => '이번 주 달린 거리가 지난주보다 많이 늘었어요. 이번 주는 더 늘리지 않고 유지해요.',
  DISCOMFORT_LOWER: () =>
    '불편한 곳이 있다고 하셔서 강도를 한 단계 낮췄어요. 통증이 계속되면 전문가와 상담해 보세요.',
  BODY_MORE_WALK: () => '관절 부담을 줄이도록 걷기 시간을 조금 더 넣었어요.',
  UNWELL_LOWER: () => '컨디션이 좋지 않다고 하셔서 오늘은 가볍게 해요.',
  UNWELL_REST: () => '컨디션이 좋지 않은 날은 푹 쉬는 것도 훈련이에요.',
  REST_CONSECUTIVE_DAYS: () => '최근 3일 연속으로 달렸어요. 오늘은 쉬면서 회복해요.',
  REST_WEEKLY_TARGET_MET: ({ sessionsPerWeek }) =>
    `최근 7일 동안 목표한 주 ${sessionsPerWeek}회를 채웠어요. 오늘은 쉬어도 좋아요.`,
  REST_ALREADY_RAN_TODAY: () => '오늘은 이미 달렸어요. 잘하셨어요!',
};

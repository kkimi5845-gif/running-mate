import type { Profile } from '@/profile/options';

/** 강도: 낮은 순서 */
export type Intensity = 'very_easy' | 'easy' | 'moderate';

export type Segment = { kind: 'walk' | 'run'; minutes: number };

/** 오늘의 운동 구성: 준비 걷기 → (본 운동 × 반복) → 마무리 걷기 */
export type Workout = {
  warmupMin: number;
  main: Segment[]; // 한 세트
  repeat: number;
  cooldownMin: number;
};

export type ReasonCode =
  | 'BASE_WALK_MOSTLY' // 걷기 위주 + 짧은 달리기
  | 'BASE_INTERVALS' // 달리기 구간을 늘려 가는 교차 구성
  | 'BASE_CONTINUOUS' // 지속 달리기
  | 'PROGRESS_UP' // 최근 꾸준히 달려서 한 단계 올림
  | 'WEEKLY_JUMP_HOLD' // 주간 거리가 30% 넘게 늘어 이번 주는 증량하지 않음
  | 'DISCOMFORT_LOWER' // 불편한 부위가 있어 강도 한 단계 낮춤
  | 'BODY_MORE_WALK' // 관절 부담을 줄이도록 걷기 비중 확대
  | 'UNWELL_LOWER' // 컨디션이 안 좋아 강도 낮춤
  | 'UNWELL_REST' // 컨디션이 안 좋아 휴식
  | 'REST_CONSECUTIVE_DAYS' // 최근 3일 연속 러닝 → 휴식
  | 'REST_WEEKLY_TARGET_MET' // 이번 주 목표 횟수를 채움 → 휴식
  | 'REST_ALREADY_RAN_TODAY'; // 오늘 이미 달림

export type Recommendation = {
  rest: boolean;
  workout: Workout | null; // 휴식이면 null
  totalMinutes: number; // 휴식이면 0
  intensity: Intensity;
  level: number; // 단계표(LADDER)에서의 위치 — 확인·테스트용
  reasons: ReasonCode[];
};

/** 엔진에 넣는 최근 러닝 기록 (끝난 기록만) */
export type RunSummary = {
  startedAt: string; // ISO
  distanceM: number;
  durationSec: number;
};

export type BodyInfo = {
  heightCm: number | null;
  weightKg: number | null;
  bodyFatPct: number | null;
  skeletalMuscleKg: number | null;
};

export type EngineInput = {
  profile: Profile;
  body: BodyInfo | null; // 최신 인바디 (없으면 null)
  recentRuns: RunSummary[]; // 최근 2주 기록
  today: Date;
  feelingUnwell?: boolean; // "오늘 컨디션이 안 좋아요"
};

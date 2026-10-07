/**
 * 오늘의 추천 계산 (순수 함수 — 같은 입력이면 항상 같은 결과, 단위 테스트 대상)
 * 규칙의 숫자와 문구는 모두 rules.ts에 있다.
 */
import {
  BMI_MORE_WALK,
  BODY_FAT_MORE_WALK,
  CONTINUOUS_BREAK_EVERY_MIN,
  COOLDOWN_MIN,
  EXTRA_WALK_MIN,
  FIRST_TIMER_LEVEL,
  LADDER,
  MAX_REPEAT,
  MAX_STEP_UPS,
  MIN_COUNTED_RUN_M,
  REST_AFTER_CONSECUTIVE_DAYS,
  SESSIONS_PER_STEP_UP,
  SHORT_COOLDOWN_MIN,
  SHORT_SESSION_MIN,
  SHORT_WARMUP_MIN,
  START_LEVEL,
  WARMUP_MIN,
  WEEKLY_JUMP_RATIO,
} from './rules';
import type { BodyInfo, EngineInput, Intensity, ReasonCode, Recommendation, Segment, Workout } from './types';

const INTENSITY_ORDER: Intensity[] = ['very_easy', 'easy', 'moderate'];

function lowerIntensity(i: Intensity): Intensity {
  return INTENSITY_ORDER[Math.max(0, INTENSITY_ORDER.indexOf(i) - 1)];
}

/** 휴대폰 시간대 기준 날짜 키 'YYYY-MM-DD' */
function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** today에서 n일 전 0시 */
function daysAgo(today: Date, n: number): Date {
  return new Date(today.getFullYear(), today.getMonth(), today.getDate() - n);
}

/** 관절 부담을 줄이기 위해 걷기 비중을 늘릴지 (판정이 아닌 조심 기준) */
export function shouldAddWalking(body: BodyInfo | null): boolean {
  if (!body) return false;
  if (body.bodyFatPct !== null && body.bodyFatPct >= BODY_FAT_MORE_WALK) return true;
  if (body.heightCm && body.weightKg) {
    const m = body.heightCm / 100;
    if (body.weightKg / (m * m) >= BMI_MORE_WALK) return true;
  }
  return false;
}

/** 최근 기록 정리: 짧은 시험 기록을 빼고, 날짜·주간 합계를 계산한다 */
export function summarizeHistory(input: Pick<EngineInput, 'recentRuns' | 'today'>) {
  const { today } = input;
  const runs = input.recentRuns.filter((r) => r.distanceM >= MIN_COUNTED_RUN_M);
  const runDays = new Set(runs.map((r) => dayKey(new Date(r.startedAt))));

  const thisWeekStart = daysAgo(today, 6).getTime(); // 오늘 포함 최근 7일
  const prevWeekStart = daysAgo(today, 13).getTime(); // 그 전 7일
  const twoWeekRuns = runs.filter((r) => new Date(r.startedAt).getTime() >= prevWeekStart);
  const thisWeek = twoWeekRuns.filter((r) => new Date(r.startedAt).getTime() >= thisWeekStart);
  const prevWeek = twoWeekRuns.filter((r) => new Date(r.startedAt).getTime() < thisWeekStart);

  let consecutiveDaysBeforeToday = 0;
  while (runDays.has(dayKey(daysAgo(today, consecutiveDaysBeforeToday + 1)))) {
    consecutiveDaysBeforeToday++;
  }

  return {
    ranToday: runDays.has(dayKey(today)),
    consecutiveDaysBeforeToday,
    sessionsLast14: twoWeekRuns.length,
    sessionsThisWeek: thisWeek.length,
    sessionsPrevWeek: prevWeek.length,
    metersThisWeek: thisWeek.reduce((sum, r) => sum + r.distanceM, 0),
    metersPrevWeek: prevWeek.reduce((sum, r) => sum + r.distanceM, 0),
  };
}

function rest(reason: ReasonCode, level: number): Recommendation {
  return { rest: true, workout: null, totalMinutes: 0, intensity: 'very_easy', level, reasons: [reason] };
}

export function workoutMinutes(w: Workout): number {
  const set = w.main.reduce((sum, s) => sum + s.minutes, 0);
  return w.warmupMin + set * w.repeat + w.cooldownMin;
}

export function recommend(input: EngineInput): Recommendation {
  const { profile, feelingUnwell = false } = input;
  const h = summarizeHistory(input);

  const baseLevel = profile.experience === 'none' ? FIRST_TIMER_LEVEL : START_LEVEL[profile.continuousRun];

  // 1) 휴식 규칙 (먼저 맞는 것 하나)
  if (h.ranToday) return rest('REST_ALREADY_RAN_TODAY', baseLevel);
  if (h.consecutiveDaysBeforeToday >= REST_AFTER_CONSECUTIVE_DAYS) return rest('REST_CONSECUTIVE_DAYS', baseLevel);
  if (h.sessionsThisWeek >= profile.sessionsPerWeek) return rest('REST_WEEKLY_TARGET_MET', baseLevel);

  // 2) 꾸준함에 따라 단계 올리기. 주간 거리가 급히 늘었으면 지난주 기준으로만(이번 주는 증량하지 않음).
  const adjustments: ReasonCode[] = [];
  const jumped = h.metersPrevWeek > 0 && h.metersThisWeek > h.metersPrevWeek * WEEKLY_JUMP_RATIO;
  const sessionsForProgress = jumped ? h.sessionsPrevWeek : h.sessionsLast14;
  const stepUps = Math.min(Math.floor(sessionsForProgress / SESSIONS_PER_STEP_UP), MAX_STEP_UPS);
  let level = Math.min(baseLevel + stepUps, LADDER.length - 1);
  if (level > baseLevel) adjustments.push('PROGRESS_UP');
  if (jumped) adjustments.push('WEEKLY_JUMP_HOLD');

  // 3) 불편한 부위 → 한 단계 낮춤
  let lowered = false;
  if (profile.hasDiscomfort) {
    level = Math.max(0, level - 1);
    lowered = true;
    adjustments.push('DISCOMFORT_LOWER');
  }

  // 4) 오늘 컨디션이 안 좋음 → 한 단계 더 낮추고, 더 낮출 수 없으면 휴식
  if (feelingUnwell) {
    if (level === 0) return rest('UNWELL_REST', level);
    level -= 1;
    lowered = true;
    adjustments.push('UNWELL_LOWER');
  }

  const step = LADDER[level];
  const intensity = lowered ? lowerIntensity(step.intensity) : step.intensity;

  // 5) 시간 맞추기
  const short = profile.minutesPerSession < SHORT_SESSION_MIN;
  const warmupMin = short ? SHORT_WARMUP_MIN : WARMUP_MIN;
  const cooldownMin = short ? SHORT_COOLDOWN_MIN : COOLDOWN_MIN;
  const mainBudget = Math.max(5, profile.minutesPerSession - warmupMin - cooldownMin);

  // 6) 걷기 비중 늘리기 (몸 정보, 보수적으로)
  const moreWalk = shouldAddWalking(input.body);

  let main: Segment[];
  let repeat: number;
  if (step.kind === 'continuous' && !moreWalk) {
    main = [{ kind: 'run', minutes: Math.min(step.runMin, mainBudget) }];
    repeat = 1;
  } else {
    const runMin = step.kind === 'continuous' ? CONTINUOUS_BREAK_EVERY_MIN : step.runMin;
    const walkMin = (step.kind === 'continuous' ? 1 : step.walkMin) + (moreWalk && step.kind === 'intervals' ? EXTRA_WALK_MIN : 0);
    const budget = step.kind === 'continuous' ? Math.min(step.runMin, mainBudget) : mainBudget;
    main = [
      { kind: 'run', minutes: runMin },
      { kind: 'walk', minutes: walkMin },
    ];
    repeat = Math.max(1, Math.min(MAX_REPEAT, Math.floor(budget / (runMin + walkMin))));
  }
  if (moreWalk) adjustments.push('BODY_MORE_WALK');

  const workout: Workout = { warmupMin, main, repeat, cooldownMin };
  const baseReason: ReasonCode =
    level === 0 ? 'BASE_WALK_MOSTLY' : step.kind === 'continuous' && !moreWalk ? 'BASE_CONTINUOUS' : 'BASE_INTERVALS';

  return {
    rest: false,
    workout,
    totalMinutes: workoutMinutes(workout),
    intensity,
    level,
    reasons: [baseReason, ...adjustments],
  };
}

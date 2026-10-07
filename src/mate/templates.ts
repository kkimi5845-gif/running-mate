/**
 * 러닝메이트 말투별 문구 템플릿.
 * 추천 엔진의 이유 코드를 "설명"만 한다 — 추천 내용(시간·구성·강도)은 바꾸지 않는다.
 * 의학적 판단으로 읽힐 수 있는 표현은 쓰지 않는다.
 */
import type { Intensity, ReasonCode } from '@/engine/types';

import type { MateTone } from './types';

type ByTone = Record<MateTone, string>;

export const GREETING: Record<MateTone, (nameIeyo: string) => string> = {
  gentle: (n) => `안녕하세요, ${n}.`,
  cheerful: (n) => `${n}! 오늘도 반가워요!`,
};

export const REST_HEADLINE: ByTone = {
  gentle: '오늘은 푹 쉬는 날로 해요.',
  cheerful: '오늘은 쉬는 날! 충전하고 다음에 달려요!',
};

export const REASON_LINES: Record<ReasonCode, ByTone> = {
  BASE_WALK_MOSTLY: {
    gentle: '걷기를 넉넉히 하고, 아주 짧게만 달려 볼게요.',
    cheerful: '걷다가 살짝 달리기! 가볍게 몸을 깨워 봐요.',
  },
  BASE_INTERVALS: {
    gentle: '달리기와 걷기를 번갈아 하면서 조금씩 늘려 가요.',
    cheerful: '달리고, 걷고, 또 달리고! 리듬 타면서 가 봐요.',
  },
  BASE_CONTINUOUS: {
    gentle: '편한 속도로 이어서 달려 볼까요?',
    cheerful: '쭉 이어서 달려 봐요. 할 수 있어요!',
  },
  PROGRESS_UP: {
    gentle: '요즘 꾸준히 달려서 달리는 시간을 조금 늘렸어요.',
    cheerful: '꾸준히 달린 덕분에 한 단계 올라갔어요! 멋져요!',
  },
  WEEKLY_JUMP_HOLD: {
    gentle: '이번 주에 거리가 많이 늘었으니, 오늘은 늘리지 않고 지금처럼 해요.',
    cheerful: '이번 주 엄청 달렸어요! 그래서 오늘은 지금 수준 그대로 유지해요.',
  },
  DISCOMFORT_LOWER: {
    gentle: '불편한 곳이 있다고 하셔서 강도를 한 단계 낮췄어요. 통증이 계속되면 전문가와 상담해 보세요.',
    cheerful: '불편한 곳을 생각해서 한 단계 낮췄어요. 통증이 계속되면 꼭 전문가와 상담해요!',
  },
  BODY_MORE_WALK: {
    gentle: '관절에 부담이 덜 가도록 걷기 시간을 조금 더 넣었어요.',
    cheerful: '관절 부담 줄이기! 걷기를 조금 더 넣었어요.',
  },
  UNWELL_LOWER: {
    gentle: '컨디션이 좋지 않다고 하셔서 오늘은 더 가볍게 해요. 무리하지 마세요.',
    cheerful: '컨디션이 별로인 날엔 가볍게! 오늘은 살살 가요.',
  },
  UNWELL_REST: {
    gentle: '컨디션이 좋지 않은 날은 쉬는 것도 훈련이에요. 푹 쉬세요.',
    cheerful: '오늘은 쉬어요! 쉬는 것도 실력이에요.',
  },
  REST_CONSECUTIVE_DAYS: {
    gentle: '3일 연속으로 달렸어요. 오늘은 몸이 회복할 시간을 주세요.',
    cheerful: '3일 연속 달리기 성공! 오늘은 회복하는 날이에요.',
  },
  REST_WEEKLY_TARGET_MET: {
    gentle: '이번 주 목표 횟수를 채웠어요. 오늘은 편히 쉬어도 괜찮아요.',
    cheerful: '이번 주 목표 달성! 오늘은 마음 편히 쉬어요.',
  },
  REST_ALREADY_RAN_TODAY: {
    gentle: '오늘은 이미 달렸어요. 정말 잘하셨어요.',
    cheerful: '오늘 러닝 완료! 최고예요!',
  },
};

export const COURSE_LINE: Record<MateTone, (km: string) => string> = {
  gentle: (km) => `지난번에 달린 ${km}km 코스가 오늘과 잘 맞을 것 같아요.`,
  cheerful: (km) => `지난번 ${km}km 코스 어때요? 오늘 딱이에요!`,
};

/** 강도를 말로 풀어서 (문장 끝에 붙인다) */
export const INTENSITY_PHRASE: Record<Intensity, string> = {
  very_easy: '숨이 차지 않게 아주 천천히',
  easy: '옆 사람과 대화할 수 있는 편한 속도로',
  moderate: '조금 숨이 차지만 말은 할 수 있는 속도로',
};

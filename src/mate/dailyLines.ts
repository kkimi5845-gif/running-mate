/**
 * 홈 맨 위 "오늘의 한 줄" (순수 함수 — 단위 테스트 대상)
 * 그날의 추천·컨디션에 맞는 묶음에서 날짜에 따라 한 문장을 고른다.
 * 같은 날에는 같은 문장이 나오고(앱을 다시 열어도), 누르면 다음 문장으로 바뀐다.
 * 유명인 명언은 출처가 틀릴 위험이 있어, 러닝메이트가 직접 하는 말로 썼다.
 */
import type { Recommendation } from '@/engine/types';

export type LineCategory = 'run' | 'rest' | 'care' | 'progress';

export const DAILY_LINES: Record<LineCategory, string[]> = {
  run: [
    '천천히 가도 멈추지만 않으면 앞으로 가고 있어요.',
    '오늘의 한 걸음이 내일의 1km가 돼요.',
    '빨리보다 꾸준히, 그게 러너의 비밀이에요.',
    '첫 1분이 가장 어려워요. 문을 나서면 반은 한 거예요.',
    '숨이 편한 속도가 가장 멀리 가는 속도예요.',
    '어제의 나보다 조금만 더, 그거면 충분해요.',
    '달리는 동안은 오롯이 나를 위한 시간이에요.',
    '완벽한 날을 기다리지 말고, 오늘을 좋은 날로 만들어요.',
    '발걸음은 작아도 쌓이면 길이 돼요.',
    '끝까지 가 본 사람만 결승선의 바람을 알아요.',
  ],
  rest: [
    '쉬는 날도 훈련이에요. 몸이 단단해지는 시간이에요.',
    '잘 쉬어야 잘 달릴 수 있어요.',
    '오늘의 휴식이 내일의 가벼운 발걸음을 만들어요.',
    '멈춤은 포기가 아니라 다음을 위한 준비예요.',
    '가볍게 산책하며 하늘 한번 올려다보는 건 어때요?',
    '꾸준함은 쉬는 날까지 지키는 약속이에요.',
  ],
  care: [
    '오늘은 나에게 다정한 날로 해요.',
    '느려도 괜찮아요. 내 몸의 속도를 따라가요.',
    '컨디션이 안 좋은 날엔 가볍게, 그것도 충분히 잘한 거예요.',
    '무리하지 않는 것도 실력이에요.',
    '몸이 보내는 신호에 귀 기울이는 게 오래 달리는 비결이에요.',
  ],
  progress: [
    '꾸준함이 쌓여 한 단계 올라왔어요. 스스로를 칭찬해 주세요.',
    '지난번보다 조금 더 달릴 수 있게 됐어요. 그게 성장이에요.',
    '어느새 여기까지 왔어요. 오늘도 한 걸음 더.',
    '작은 성공이 모여 큰 자신감이 돼요.',
  ],
};

/** 오늘 상태에 맞는 묶음 */
export function dailyCategory(rec: Recommendation, unwell: boolean): LineCategory {
  if (unwell) return 'care';
  if (rec.rest) return 'rest';
  if (rec.reasons.includes('PROGRESS_UP')) return 'progress';
  return 'run';
}

function hash(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  return h;
}

/** dayKey('YYYY-MM-DD')와 묶음으로 문장을 고른다. offset만큼 다음 문장 */
export function pickDailyLine(category: LineCategory, dayKey: string, offset = 0): string {
  const lines = DAILY_LINES[category];
  return lines[(hash(`${dayKey}:${category}`) + offset) % lines.length];
}

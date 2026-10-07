/** 러닝메이트 말투 */
export type MateTone = 'gentle' | 'cheerful';

export const TONE_LABEL: Record<MateTone, { title: string; sample: string }> = {
  gentle: { title: '다정한', sample: '오늘도 천천히, 함께 가 봐요.' },
  cheerful: { title: '씩씩한', sample: '좋아요! 오늘도 힘차게 가 볼까요?' },
};

/** 러닝메이트가 하는 말 */
export type MateMessage = {
  lines: string[]; // 말풍선에 한 줄씩
  speech: string; // 소리로 읽을 문장 (lines를 이어 붙인 것)
};

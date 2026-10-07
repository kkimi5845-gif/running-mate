import { expandPlan } from '@/coach/plan';
import type { Recommendation } from '@/engine/types';

import { CHEERS, cueSpeech, paceSpeech } from '../coachLines';
import { DAILY_LINES, dailyCategory, pickDailyLine } from '../dailyLines';

const banned = ['비만', '과체중', '질환', '진단', '처방', '위험', '정상', '이상 소견'];

describe('음성 코칭 문구', () => {
  const plan = expandPlan({
    warmupMin: 5,
    main: [
      { kind: 'run', minutes: 2 },
      { kind: 'walk', minutes: 1 },
    ],
    repeat: 2,
    cooldownMin: 5,
  });

  it('구간마다 무엇을 할지 말한다', () => {
    const [warm, run1, walk1, run2] = plan.segments;
    const cue = (i: number, segment = plan.segments[i]) => ({
      key: `seg:${i}`,
      type: 'segment' as const,
      segment,
      isLastSet: segment.set === plan.sets,
      sets: plan.sets,
    });
    expect(cueSpeech(cue(0, warm), 'gentle')).toBe('준비 걷기 5분으로 시작해요. 천천히 걸어요.');
    expect(cueSpeech(cue(1, run1), 'gentle')).toBe('이제 2분 달려요. 편한 속도로요. 2세트 중 1세트예요.');
    expect(cueSpeech(cue(2, walk1), 'cheerful')).toBe('걷기! 1분 동안 숨 돌려요!');
    expect(cueSpeech(cue(3, run2), 'gentle')).toContain('마지막 세트');
  });

  it('1km 안내와 페이스 읽기', () => {
    expect(paceSpeech(390)).toBe('6분 30초');
    expect(cueSpeech({ key: 'km:2', type: 'km', km: 2, avgPaceSecPerKm: 390 }, 'gentle')).toBe(
      '2킬로미터 지났어요. 평균 페이스는 6분 30초예요.',
    );
    expect(cueSpeech({ key: 'km:1', type: 'km', km: 1, avgPaceSecPerKm: null }, 'cheerful')).toBe('1킬로미터 돌파!');
  });

  it('응원 문구', () => {
    expect(cueSpeech({ key: 'half', type: 'cheer', kind: 'half', n: 0 }, 'gentle')).toContain('반');
    const a = cueSpeech({ key: 'cheer:1', type: 'cheer', kind: 'random', n: 1 }, 'cheerful');
    const b = cueSpeech({ key: 'cheer:2', type: 'cheer', kind: 'random', n: 2 }, 'cheerful');
    expect(a).not.toBe(b);
    for (const tone of ['gentle', 'cheerful'] as const) {
      const all = [CHEERS[tone].half, CHEERS[tone].almost, ...CHEERS[tone].random];
      for (const line of all) for (const w of banned) expect(line).not.toContain(w);
    }
  });

  it('완료 안내', () => {
    expect(cueSpeech({ key: 'done', type: 'planDone' }, 'gentle')).toContain('끝내기');
  });
});

describe('오늘의 한 줄', () => {
  const rec = (p: Partial<Recommendation>): Recommendation => ({
    rest: false,
    workout: null,
    totalMinutes: 30,
    intensity: 'easy',
    level: 1,
    reasons: ['BASE_INTERVALS'],
    ...p,
  });

  it('상태에 맞는 묶음', () => {
    expect(dailyCategory(rec({}), false)).toBe('run');
    expect(dailyCategory(rec({ rest: true }), false)).toBe('rest');
    expect(dailyCategory(rec({ reasons: ['BASE_INTERVALS', 'PROGRESS_UP'] }), false)).toBe('progress');
    expect(dailyCategory(rec({ rest: true }), true)).toBe('care');
  });

  it('같은 날에는 같은 문장, 누르면 다음 문장', () => {
    const a = pickDailyLine('run', '2026-10-07');
    expect(pickDailyLine('run', '2026-10-07')).toBe(a);
    expect(pickDailyLine('run', '2026-10-07', 1)).not.toBe(a);
    expect(DAILY_LINES.run).toContain(a);
  });

  it('날짜가 바뀌면 대체로 다른 문장', () => {
    const days = Array.from({ length: 10 }, (_, i) => pickDailyLine('run', `2026-10-${String(i + 1).padStart(2, '0')}`));
    expect(new Set(days).size).toBeGreaterThan(3);
  });

  it('모든 문장에 진단·판정 표현이 없다', () => {
    for (const list of Object.values(DAILY_LINES)) {
      for (const line of list) for (const w of banned) expect(line).not.toContain(w);
    }
  });
});

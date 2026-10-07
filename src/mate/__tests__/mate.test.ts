import { recommend } from '@/engine/recommend';
import type { Recommendation, ReasonCode } from '@/engine/types';
import type { Profile } from '@/profile/options';

import { buildMateMessage, generateMateMessage } from '../generateMateMessage';
import { hasBatchim, withEuro, withIeyo } from '../korean';
import { REASON_LINES } from '../templates';

const profile: Profile = {
  experience: 'under_6m',
  continuousRun: '5min',
  goal: 'habit',
  sessionsPerWeek: 3,
  minutesPerSession: 30,
  hasDiscomfort: true,
  discomfortAreas: ['knee'],
};
const rec = recommend({ profile, body: null, recentRuns: [], today: new Date(2026, 9, 7) });

describe('조사', () => {
  it('받침에 따라 이에요/예요', () => {
    expect(hasBatchim('달리')).toBe(false);
    expect(hasBatchim('민준')).toBe(true);
    expect(withIeyo('달리')).toBe('달리예요');
    expect(withIeyo('민준')).toBe('민준이에요');
    expect(withIeyo('Rio')).toBe('Rio예요');
    expect(withIeyo('30초')).toBe('30초예요');
    expect(withEuro('5분')).toBe('5분으로');
    expect(withEuro('30초')).toBe('30초로');
    expect(withEuro('1일')).toBe('1일로');
  });
});

describe('generateMateMessage', () => {
  it('이름으로 인사하고 추천 내용(시간·구성)을 그대로 설명한다', async () => {
    const m = await generateMateMessage(rec, 'gentle', { name: '달리' });
    expect(m.lines[0]).toBe('안녕하세요, 달리예요.');
    expect(m.speech).toContain(`${rec.totalMinutes}분`);
    expect(m.speech).toContain(`${rec.workout!.repeat}번`);
    expect(m.speech).toContain('전문가와 상담');
  });

  it('말투에 따라 문장이 달라도 숫자는 같다', () => {
    const a = buildMateMessage(rec, 'gentle');
    const b = buildMateMessage(rec, 'cheerful');
    expect(a.speech).not.toBe(b.speech);
    const nums = (s: string) => s.match(/\d+/g);
    expect(nums(a.lines[0])).toEqual(nums(b.lines[0]));
  });

  it('추천 객체를 바꾸지 않는다', () => {
    const copy: Recommendation = JSON.parse(JSON.stringify(rec));
    buildMateMessage(rec, 'cheerful', { name: '달리', courseKm: '2.1' });
    expect(rec).toEqual(copy);
  });

  it('휴식이면 쉬는 이유를 말한다', () => {
    const rest: Recommendation = {
      rest: true,
      workout: null,
      totalMinutes: 0,
      intensity: 'very_easy',
      level: 0,
      reasons: ['REST_CONSECUTIVE_DAYS'],
    };
    expect(buildMateMessage(rest, 'gentle').speech).toContain('3일 연속');
  });

  it('코스가 있으면 코스를 추천한다 (휴식일 땐 안 함)', () => {
    expect(buildMateMessage(rec, 'gentle', { courseKm: '2.1' }).speech).toContain('2.1km 코스');
  });

  it('모든 이유 코드에 두 말투 문구가 있고, 진단·판정 표현이 없다', () => {
    const banned = ['비만', '과체중', '질환', '진단', '처방', '위험', '정상', '이상 소견'];
    for (const code of Object.keys(REASON_LINES) as ReasonCode[]) {
      for (const tone of ['gentle', 'cheerful'] as const) {
        const text = REASON_LINES[code][tone];
        expect(text.length).toBeGreaterThan(0);
        for (const w of banned) expect(text).not.toContain(w);
      }
    }
  });
});

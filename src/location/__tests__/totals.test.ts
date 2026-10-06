import { computeTotals, startOfWeek } from '../totals';

describe('totals', () => {
  // 2026-10-07 (수) 12:00
  const now = new Date(2026, 9, 7, 12, 0);
  const at = (m: number, d: number, h = 8) => new Date(2026, m - 1, d, h).toISOString();

  it('주 시작은 월요일', () => {
    expect(startOfWeek(now)).toEqual(new Date(2026, 9, 5));
    expect(startOfWeek(new Date(2026, 9, 11))).toEqual(new Date(2026, 9, 5)); // 일요일
  });

  it('오늘·이번 주·이번 달 합산', () => {
    const totals = computeTotals(
      [
        { startedAt: at(10, 7), distanceM: 3000 }, // 오늘
        { startedAt: at(10, 5), distanceM: 2000 }, // 이번 주 월요일
        { startedAt: at(10, 2), distanceM: 1000 }, // 이번 달, 지난주
        { startedAt: at(9, 30), distanceM: 5000 }, // 지난달
      ],
      now,
    );
    expect(totals).toEqual({ todayM: 3000, weekM: 5000, monthM: 6000 });
  });
});

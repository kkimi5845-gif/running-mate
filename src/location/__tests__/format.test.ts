import { formatDuration, formatKm, formatPace } from '../format';

describe('format', () => {
  it('거리는 내림해서 소수 둘째 자리', () => {
    expect(formatKm(0)).toBe('0.00');
    expect(formatKm(3219)).toBe('3.21');
    expect(formatKm(999)).toBe('0.99');
  });
  it('시간', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(65)).toBe('1:05');
    expect(formatDuration(3723)).toBe('1:02:03');
  });
  it('페이스', () => {
    expect(formatPace(390)).toBe(`6'30"`);
    expect(formatPace(359.6)).toBe(`6'00"`);
    expect(formatPace(null)).toBe(`-'--"`);
    expect(formatPace(4000)).toBe(`-'--"`);
  });
});

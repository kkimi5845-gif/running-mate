import { shoeStatus, statusMessage, wearRatio } from '../status';

describe('shoeStatus', () => {
  it('80% 미만은 좋음', () => {
    expect(shoeStatus(0, 600)).toBe('ok');
    expect(shoeStatus(479.9, 600)).toBe('ok');
  });
  it('80% 이상이면 교체 준비', () => {
    expect(shoeStatus(480, 600)).toBe('ready');
    expect(shoeStatus(599.9, 600)).toBe('ready');
  });
  it('100% 이상이면 교체 권장', () => {
    expect(shoeStatus(600, 600)).toBe('replace');
    expect(shoeStatus(750, 600)).toBe('replace');
  });
  it('권장 거리를 바꾸면 기준도 바뀐다', () => {
    expect(shoeStatus(400, 500)).toBe('ready');
  });
  it('권장 거리가 0 이하면 판단하지 않는다', () => {
    expect(shoeStatus(1000, 0)).toBe('ok');
  });
});

describe('wearRatio', () => {
  it('0~1로 자른다', () => {
    expect(wearRatio(300, 600)).toBe(0.5);
    expect(wearRatio(900, 600)).toBe(1);
    expect(wearRatio(-5, 600)).toBe(0);
  });
});

describe('statusMessage', () => {
  it('상태별 안내', () => {
    expect(statusMessage('ok', 300)).toBeNull();
    expect(statusMessage('ready', 72.4)).toContain('72km');
    expect(statusMessage('replace', -10)).toContain('바꿀 때');
  });
});

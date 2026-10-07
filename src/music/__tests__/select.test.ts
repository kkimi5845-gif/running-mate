import { displayName, nextIndex, playlistFor, type Track } from '../select';

const t = (id: number, kind: 'walk' | 'run'): Track => ({ id, kind, name: `곡${id}`, uri: `file:///${id}.mp3` });

describe('배경음악 고르기', () => {
  it('구간에 맞는 목록', () => {
    const all = [t(1, 'walk'), t(2, 'run'), t(3, 'run')];
    expect(playlistFor('walk', all).map((x) => x.id)).toEqual([1]);
    expect(playlistFor('run', all).map((x) => x.id)).toEqual([2, 3]);
  });
  it('한쪽이 비어 있으면 다른 쪽 곡을 쓴다', () => {
    expect(playlistFor('run', [t(1, 'walk')]).map((x) => x.id)).toEqual([1]);
    expect(playlistFor('walk', [])).toEqual([]);
  });
  it('끝나면 처음 곡으로', () => {
    expect(nextIndex(0, 3)).toBe(1);
    expect(nextIndex(2, 3)).toBe(0);
    expect(nextIndex(-1, 3)).toBe(0);
    expect(nextIndex(0, 0)).toBe(-1);
  });
  it('파일 이름에서 확장자 빼기', () => {
    expect(displayName('봄날 산책.mp3')).toBe('봄날 산책');
    expect(displayName('.mp3')).toBe('이름 없는 곡');
  });
});

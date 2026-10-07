import { cuesBetween } from '../cues';
import { expandPlan, parsePlan, positionAt } from '../plan';

const workout = {
  warmupMin: 5,
  main: [
    { kind: 'run' as const, minutes: 2 },
    { kind: 'walk' as const, minutes: 2 },
  ],
  repeat: 3,
  cooldownMin: 5,
};
const plan = expandPlan(workout);

describe('expandPlan', () => {
  it('준비 걷기 → 달리기·걷기 × 세트 → 마무리 걷기', () => {
    expect(plan.segments.map((s) => `${s.phase}:${s.kind}:${s.seconds / 60}:${s.set ?? '-'}`)).toEqual([
      'warmup:walk:5:-',
      'main:run:2:1',
      'main:walk:2:1',
      'main:run:2:2',
      'main:walk:2:2',
      'main:run:2:3',
      'main:walk:2:3',
      'cooldown:walk:5:-',
    ]);
    expect(plan.totalSec).toBe(22 * 60);
    expect(plan.sets).toBe(3);
  });

  it('저장했다 다시 읽어도 같다', () => {
    expect(parsePlan(JSON.stringify(plan))).toEqual(plan);
    expect(parsePlan(null)).toBeNull();
    expect(parsePlan('깨진 글자')).toBeNull();
  });
});

describe('positionAt', () => {
  it('지금 구간과 남은 시간', () => {
    const p = positionAt(plan, 5 * 60 + 30); // 첫 달리기 30초째
    expect(p.done).toBe(false);
    if (!p.done) {
      expect(p.segment.kind).toBe('run');
      expect(p.segment.set).toBe(1);
      expect(p.remainingSec).toBe(90);
      expect(p.next?.kind).toBe('walk');
    }
  });
  it('계획 시간이 지나면 끝', () => {
    expect(positionAt(plan, 22 * 60).done).toBe(true);
  });
});

describe('cuesBetween', () => {
  const at = (elapsedSec: number, distanceM = 0) => ({ elapsedSec, distanceM });

  it('시작하자마자 준비 걷기 안내', () => {
    const cues = cuesBetween(plan, at(-1), at(0));
    expect(cues).toHaveLength(1);
    expect(cues[0]).toMatchObject({ key: 'seg:0', type: 'segment' });
  });

  it('구간이 바뀌는 순간 한 번만', () => {
    expect(cuesBetween(plan, at(299), at(300))[0]).toMatchObject({ key: 'seg:1' });
    expect(cuesBetween(plan, at(300), at(301))).toHaveLength(0);
  });

  it('마지막 세트 표시', () => {
    const c = cuesBetween(plan, at(5 * 60 + 8 * 60 - 1), at(5 * 60 + 8 * 60))[0];
    expect(c).toMatchObject({ type: 'segment', isLastSet: true });
  });

  it('여러 구간을 한 번에 지나쳤으면 마지막 구간만', () => {
    const cues = cuesBetween(plan, at(0), at(5 * 60 + 5 * 60));
    expect(cues).toHaveLength(1);
    expect(cues[0].key).toBe('seg:3');
  });

  it('계획이 끝나면 완료 안내만', () => {
    const cues = cuesBetween(plan, at(22 * 60 - 1), at(22 * 60));
    expect(cues).toEqual([{ key: 'done', type: 'planDone' }]);
  });

  it('1km마다 평균 페이스와 함께', () => {
    // (3분 응원 시각과 겹치지 않게 345초로)
    const cues = cuesBetween(null, at(335, 990), at(345, 1005));
    expect(cues).toHaveLength(1);
    expect(cues[0]).toMatchObject({ key: 'km:1', type: 'km', km: 1 });
    if (cues[0].type === 'km') expect(cues[0].avgPaceSecPerKm).toBeCloseTo(343.3, 0);
  });

  it('자유 러닝(계획 없음)도 3분마다 응원', () => {
    expect(cuesBetween(null, at(170), at(175, 500))).toHaveLength(0);
    expect(cuesBetween(null, at(179), at(180, 500))).toEqual([{ key: 'cheer:1', type: 'cheer', kind: 'random', n: 1 }]);
  });

  it('계획의 반이 지나면 응원', () => {
    // 21분 계획의 반(630초)은 2세트 달리기 한가운데 — 구간이 바뀌는 시각과 겹치지 않는다
    const p2 = expandPlan({ ...workout, cooldownMin: 4 });
    const half = p2.totalSec / 2;
    expect(cuesBetween(p2, at(half - 1), at(half))).toEqual([{ key: 'half', type: 'cheer', kind: 'half', n: 0 }]);
  });

  it('구간이 바뀌는 순간에는 응원 대신 구간 안내', () => {
    // 540초는 3분 응원 시각이면서 2세트 달리기 시작
    const cues = cuesBetween(plan, at(539), at(540));
    expect(cues.map((c) => c.type)).toEqual(['segment']);
  });

  it('긴 달리기 구간은 끝나기 30초 전에 응원', () => {
    const long = expandPlan({ warmupMin: 0, main: [{ kind: 'run', minutes: 2 }], repeat: 1, cooldownMin: 0 });
    expect(cuesBetween(long, at(89), at(90))[0]).toMatchObject({ key: 'almost:0', kind: 'almost' });
  });

  it('계획이 끝난 뒤에는 응원하지 않는다', () => {
    expect(cuesBetween(plan, at(22 * 60 + 179), at(22 * 60 + 180)).filter((c) => c.type === 'cheer')).toHaveLength(0);
  });
});

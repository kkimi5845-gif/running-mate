import { createRun, deleteRun, finishRun, getRun } from '../runs';
import {
  deleteShoe,
  getLastShoeId,
  getShoe,
  insertShoe,
  listShoes,
  setLastShoeId,
  setRunShoe,
  setShoeRetired,
} from '../shoes';
import { makeTestDb } from '../testing/nodeDb';

const T0 = Date.UTC(2026, 9, 7);

async function addFinishedRun(db: ReturnType<typeof makeTestDb>, shoeId: number | null, meters: number) {
  const id = await createRun(db, T0, shoeId);
  await db.runAsync('UPDATE runs SET distance_m = ? WHERE id = ?', [meters, id]);
  await finishRun(db, (await getRun(db, id))!, T0 + 60_000);
  return id;
}

describe('신발 마일리지', () => {
  it('끝난 러닝 거리와 처음 거리를 합산하고 횟수를 센다', async () => {
    const db = makeTestDb();
    const shoe = await insertShoe(db, { name: '테스트화', photoUri: null, replaceKm: 600, initialKm: 100 });
    await addFinishedRun(db, shoe, 5000);
    await addFinishedRun(db, shoe, 3000);
    await addFinishedRun(db, null, 9000); // 신발 선택 안 함
    await createRun(db, T0, shoe); // 아직 기록 중인 러닝은 합산하지 않는다

    const s = (await getShoe(db, shoe))!;
    expect(s.runKm).toBe(8);
    expect(s.runCount).toBe(2);
    expect(s.totalKm).toBe(108);
    expect(s.status).toBe('ok');
  });

  it('80%·100%에서 상태가 바뀐다', async () => {
    const db = makeTestDb();
    const shoe = await insertShoe(db, { name: 'A', photoUri: null, replaceKm: 10, initialKm: 0 });
    await addFinishedRun(db, shoe, 8000);
    expect((await getShoe(db, shoe))!.status).toBe('ready');
    await addFinishedRun(db, shoe, 2000);
    expect((await getShoe(db, shoe))!.status).toBe('replace');
  });

  it('러닝의 신발을 바꾸면 양쪽 합산이 바뀌고, 기록을 지우면 빠진다', async () => {
    const db = makeTestDb();
    const a = await insertShoe(db, { name: 'A', photoUri: null, replaceKm: 600, initialKm: 0 });
    const b = await insertShoe(db, { name: 'B', photoUri: null, replaceKm: 600, initialKm: 0 });
    const run = await addFinishedRun(db, a, 4000);

    await setRunShoe(db, run, b);
    expect((await getShoe(db, a))!.runKm).toBe(0);
    expect((await getShoe(db, b))!.runKm).toBe(4);

    await deleteRun(db, run);
    expect((await getShoe(db, b))!.runCount).toBe(0);
  });

  it('신발을 지워도 러닝 기록은 남는다', async () => {
    const db = makeTestDb();
    const a = await insertShoe(db, { name: 'A', photoUri: null, replaceKm: 600, initialKm: 0 });
    const run = await addFinishedRun(db, a, 4000);
    await deleteShoe(db, a);
    expect((await getRun(db, run))!.shoeId).toBeNull();
  });

  it('보관한 신발은 목록 뒤로 간다', async () => {
    const db = makeTestDb();
    const a = await insertShoe(db, { name: 'A', photoUri: null, replaceKm: 600, initialKm: 0 });
    await insertShoe(db, { name: 'B', photoUri: null, replaceKm: 600, initialKm: 0 });
    await setShoeRetired(db, a, true);
    expect((await listShoes(db)).map((s) => s.name)).toEqual(['B', 'A']);
  });

  it('마지막으로 고른 신발을 기억한다', async () => {
    const db = makeTestDb();
    expect(await getLastShoeId(db)).toBeNull();
    await setLastShoeId(db, 3);
    expect(await getLastShoeId(db)).toBe(3);
    await setLastShoeId(db, null);
    expect(await getLastShoeId(db)).toBeNull();
  });
});

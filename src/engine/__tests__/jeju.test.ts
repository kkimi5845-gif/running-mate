import { JEJU_COURSES, type JejuCourse } from '@/jeju/courses';
import type { Profile } from '@/profile/options';

import { howToRun, jejuTarget, kmText, recommendJejuCourses, type JejuTarget } from '../jeju';
import type { Recommendation, ReasonCode, Workout } from '../types';

const profile = (extra: Partial<Profile> = {}): Profile => ({
  experience: 'under_6m',
  continuousRun: '5min',
  goal: 'health',
  sessionsPerWeek: 3,
  minutesPerSession: 30,
  hasDiscomfort: false,
  discomfortAreas: [],
  ...extra,
});

const rec = (level: number, workout: Workout | null, reasons: ReasonCode[] = []): Recommendation => ({
  rest: workout === null,
  workout,
  totalMinutes: workout ? 30 : 0,
  intensity: 'easy',
  level,
  reasons,
});

const course = (id: string, extra: Partial<JejuCourse> = {}): JejuCourse => ({
  id,
  name: id,
  area: 'jeju_city',
  km: 3,
  shape: 'loop',
  level: 1,
  rough: null,
  feature: '',
  lat: 33.5,
  lng: 126.5,
  ...extra,
});

const target = (extra: Partial<JejuTarget> = {}): JejuTarget => ({ level: 1, km: 3, avoidRough: false, ...extra });

describe('jejuTarget', () => {
  it('교차(걷기+달리기) 단계는 입문, 거리는 시간으로 어림한다', () => {
    // 준비 5 + (달리기 2 + 걷기 2) × 5 + 마무리 5 → 달리기 10분, 걷기 20분
    const w: Workout = { warmupMin: 5, main: [{ kind: 'run', minutes: 2 }, { kind: 'walk', minutes: 2 }], repeat: 5, cooldownMin: 5 };
    const t = jejuTarget(rec(1, w), profile());
    expect(t.level).toBe(1);
    expect(t.km).toBeCloseTo((10 * 8 + 20 * 5) / 60, 1); // 3.0
    expect(t.avoidRough).toBe(false);
  });

  it('지속 20·30분은 중급, 45분은 상급', () => {
    const w: Workout = { warmupMin: 5, main: [{ kind: 'run', minutes: 30 }], repeat: 1, cooldownMin: 5 };
    expect(jejuTarget(rec(7, w), profile()).level).toBe(2);
    expect(jejuTarget(rec(8, w), profile()).level).toBe(3);
  });

  it('쉬는 날은 거리 없이 수준만', () => {
    const t = jejuTarget(rec(6, null), profile());
    expect(t.km).toBeNull();
    expect(t.level).toBe(2);
  });

  it('불편한 곳이 있거나 강도를 낮춘 날은 언덕·흙길을 피한다', () => {
    const w: Workout = { warmupMin: 5, main: [{ kind: 'run', minutes: 20 }], repeat: 1, cooldownMin: 5 };
    expect(jejuTarget(rec(6, w), profile({ hasDiscomfort: true })).avoidRough).toBe(true);
    expect(jejuTarget(rec(6, w, ['BASE_CONTINUOUS', 'UNWELL_LOWER']), profile()).avoidRough).toBe(true);
    expect(jejuTarget(rec(6, w, ['BASE_CONTINUOUS', 'PROGRESS_UP']), profile()).avoidRough).toBe(false);
  });
});

describe('howToRun', () => {
  it('트랙·한 바퀴 코스는 바퀴 수로', () => {
    expect(howToRun(course('t', { shape: 'track', km: 0.4 }), 3)).toBe('트랙 약 8바퀴');
    expect(howToRun(course('l', { km: 2.8 }), 3)).toBe('한 바퀴');
    expect(howToRun(course('l', { km: 1 }), 3)).toBe('3바퀴');
  });

  it('편도 길은 반만 가서 돌아오기, 짧으면 끝까지 왕복', () => {
    expect(howToRun(course('a', { shape: 'line', km: 6 }), 5)).toBe('약 2.5km 가서 돌아오기');
    expect(howToRun(course('b', { shape: 'line', km: 1.5 }), 4)).toBe('끝까지 갔다가 돌아오기 (왕복 약 3km)');
  });

  it('kmText는 소수 한 자리', () => {
    expect(kmText(3)).toBe('3');
    expect(kmText(2.46)).toBe('2.5');
  });
});

describe('recommendJejuCourses', () => {
  it('내 수준보다 어려운 코스는 빼고 이유를 남긴다', () => {
    const r = recommendJejuCourses([course('easy'), course('hard', { level: 3 })], target());
    expect(r.picks.map((p) => p.course.id)).toEqual(['easy']);
    expect(r.others).toEqual([{ course: expect.objectContaining({ id: 'hard' }), why: 'harder' }]);
  });

  it('언덕을 피하는 날은 rough 코스를 뺀다', () => {
    const list = [course('flat'), course('hill', { rough: '오르막' })];
    expect(recommendJejuCourses(list, target({ avoidRough: true })).picks.map((p) => p.course.id)).toEqual(['flat']);
    expect(recommendJejuCourses(list, target()).picks).toHaveLength(2);
  });

  it('위치를 알면 가까운 순서', () => {
    const list = [course('far', { lat: 33.25, lng: 126.56 }), course('near', { lat: 33.51, lng: 126.52 })];
    const r = recommendJejuCourses(list, target(), { here: { lat: 33.5, lng: 126.5 } });
    expect(r.usedLocation).toBe(true);
    expect(r.picks[0].course.id).toBe('near');
    expect(r.picks[0].awayKm).toBeGreaterThan(0);
  });

  it('수준이 딱 맞는 코스를 쉬운 코스보다 앞에', () => {
    const list = [course('easy', { level: 1 }), course('match', { level: 2, lat: 33.6 })];
    const r = recommendJejuCourses(list, target({ level: 2 }), { here: { lat: 33.5, lng: 126.5 } });
    expect(r.picks.map((p) => p.course.id)).toEqual(['match', 'easy']);
    expect(r.picks[0].exactLevel).toBe(true);
  });

  it('제주 밖(서울)에 있으면 거리순을 쓰지 않는다', () => {
    const r = recommendJejuCourses([course('a')], target(), { here: { lat: 37.56, lng: 126.97 } });
    expect(r.usedLocation).toBe(false);
    expect(r.picks[0].awayKm).toBeNull();
  });

  it('위치가 없으면 오늘 거리에 맞는 코스를 먼저', () => {
    const list = [course('short', { km: 1, shape: 'line' }), course('fit', { km: 3 })];
    expect(recommendJejuCourses(list, target({ km: 3 })).picks[0].course.id).toBe('fit');
  });

  it('지역을 고르면 그 지역만', () => {
    const list = [course('a', { area: 'east' }), course('b', { area: 'west' })];
    expect(recommendJejuCourses(list, target(), { area: 'west' }).picks.map((p) => p.course.id)).toEqual(['b']);
  });

  it('쉬는 날은 달리는 방법 없이 목록만', () => {
    expect(recommendJejuCourses([course('a')], target({ km: null })).picks[0].how).toBeNull();
  });

  it('실제 목록: 입문 + 무릎 불편이면 입문 평지 코스만', () => {
    const r = recommendJejuCourses(JEJU_COURSES, target({ avoidRough: true }));
    expect(r.picks.length).toBeGreaterThan(5);
    expect(r.picks.every((p) => p.course.level === 1 && p.course.rough === null)).toBe(true);
  });

  it('실제 목록: id가 겹치지 않는다', () => {
    expect(new Set(JEJU_COURSES.map((c) => c.id)).size).toBe(JEJU_COURSES.length);
  });
});

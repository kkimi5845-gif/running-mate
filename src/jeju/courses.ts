/**
 * 제주 러닝 코스 목록 (앱 안에 들어 있는 고정 자료 — 인터넷에서 받아 오지 않는다)
 *
 * - 거리·좌표는 기사와 러닝 후기를 모아 정리한 "대략적인 값"이다. 현장과 다를 수 있다.
 * - lat/lng는 출발 지점 근처의 대략적인 위치다. 가까운 순서를 정하는 데만 쓴다.
 * - 코스를 고치거나 더하려면 이 배열만 고치면 된다. id는 바꾸지 않는다.
 */

/** 1 초급 · 2 중급 · 3 고급 */
export type JejuLevel = 1 | 2 | 3;

export type JejuArea = 'jeju_city' | 'seogwipo' | 'east' | 'west';

/**
 * loop: 한 바퀴 도는 코스 (km = 한 바퀴)
 * track: 운동장 트랙 (km = 한 바퀴)
 * line: 한쪽 방향 길 (km = 편도. 갔다가 돌아오면 두 배)
 */
export type JejuShape = 'loop' | 'track' | 'line';

export type JejuCourse = {
  id: string;
  name: string;
  area: JejuArea;
  km: number;
  shape: JejuShape;
  level: JejuLevel;
  /** 언덕·오름·흙길·계단이 있으면 그 내용. 없으면 null */
  rough: string | null;
  feature: string;
  lat: number;
  lng: number;
};

export const AREA_LABEL: Record<JejuArea, string> = {
  jeju_city: '제주시',
  seogwipo: '서귀포',
  east: '동쪽',
  west: '서쪽',
};

export const LEVEL_LABEL: Record<JejuLevel, string> = {
  1: '초급',
  2: '중급',
  3: '고급',
};

export const JEJU_COURSES: JejuCourse[] = [
  // ── 초급 ──
  {
    id: 'hamdeok',
    name: '함덕해수욕장 → 관곶',
    area: 'east',
    km: 3,
    shape: 'line',
    level: 1,
    rough: null,
    feature: '바닷가 평지, 경치가 좋아요',
    lat: 33.5433,
    lng: 126.6697,
  },
  {
    id: 'samyang',
    name: '삼양해수욕장 해안길',
    area: 'jeju_city',
    km: 1.5,
    shape: 'line',
    level: 1,
    rough: null,
    feature: '평지, 검은 모래 해변',
    lat: 33.5257,
    lng: 126.5866,
  },
  {
    id: 'halla-arboretum',
    name: '한라수목원 순환길',
    area: 'jeju_city',
    km: 2,
    shape: 'loop',
    level: 1,
    rough: null,
    feature: '그늘이 많아 여름에 좋아요',
    lat: 33.4699,
    lng: 126.4931,
  },
  {
    id: 'hyeopjae',
    name: '협재 → 금능 해변길',
    area: 'west',
    km: 1.5,
    shape: 'line',
    level: 1,
    rough: null,
    feature: '평지, 바다색이 예뻐요',
    lat: 33.394,
    lng: 126.2397,
  },
  {
    id: 'songaksan',
    name: '송악산 둘레길',
    area: 'west',
    km: 2.8,
    shape: 'loop',
    level: 1,
    rough: null,
    feature: '해안 평지 위주의 한 바퀴 길',
    lat: 33.2063,
    lng: 126.2897,
  },
  {
    id: 'saeseom',
    name: '새섬 (새연교)',
    area: 'seogwipo',
    km: 1,
    shape: 'loop',
    level: 1,
    rough: null,
    feature: '짧아서 처음 시작하기 좋아요',
    lat: 33.2398,
    lng: 126.5596,
  },
  {
    id: 'sinsan-park',
    name: '신산공원',
    area: 'jeju_city',
    km: 1.2,
    shape: 'loop',
    level: 1,
    rough: null,
    feature: '도심 공원, 여러 바퀴 돌기 좋아요',
    lat: 33.5067,
    lng: 126.5339,
  },
  {
    id: 'jeju-stadium',
    name: '제주종합경기장 트랙',
    area: 'jeju_city',
    km: 0.4,
    shape: 'track',
    level: 1,
    rough: null,
    feature: '바닥이 고르고 거리 재기 쉬워요',
    lat: 33.4988,
    lng: 126.5098,
  },
  {
    id: 'pyoseon',
    name: '표선 해비치 해변길',
    area: 'east',
    km: 1.5,
    shape: 'line',
    level: 1,
    rough: null,
    feature: '넓은 백사장 옆 평지',
    lat: 33.3261,
    lng: 126.8381,
  },
  // ── 중급 ──
  {
    id: 'yongdam-iho',
    name: '용담레포츠공원 → 이호테우해변',
    area: 'jeju_city',
    km: 5,
    shape: 'line',
    level: 2,
    rough: null,
    feature: '해안도로, 공항 근처',
    lat: 33.5145,
    lng: 126.5055,
  },
  {
    id: 'yongduam-dodubong',
    name: '용두암 → 도두봉 해안도로',
    area: 'jeju_city',
    km: 6,
    shape: 'line',
    level: 2,
    rough: null,
    feature: '저녁 러닝 명소',
    lat: 33.5164,
    lng: 126.5122,
  },
  {
    id: 'gwakji-aewol',
    name: '곽지 → 애월항',
    area: 'west',
    km: 6,
    shape: 'line',
    level: 2,
    rough: null,
    feature: '쭉 뻗은 해안길',
    lat: 33.4506,
    lng: 126.3048,
  },
  {
    id: 'chilsimni',
    name: '서귀포 칠십리 걷기길',
    area: 'seogwipo',
    km: 6.5,
    shape: 'line',
    level: 2,
    rough: null,
    feature: '바다와 시내를 함께 봐요',
    lat: 33.2448,
    lng: 126.5596,
  },
  {
    id: 'byeoldobong',
    name: '별도봉 장수산책로 (+사라봉)',
    area: 'jeju_city',
    km: 2.7,
    shape: 'loop',
    level: 2,
    rough: '오르막이 있어요',
    feature: '바다를 내려다보는 언덕길',
    lat: 33.519,
    lng: 126.5535,
  },
  // ── 고급 ──
  {
    id: 'woljeong-sehwa',
    name: '월정리 → 세화 해안도로',
    area: 'east',
    km: 10,
    shape: 'line',
    level: 3,
    rough: null,
    feature: '평지지만 거리가 길어요',
    lat: 33.5562,
    lng: 126.7959,
  },
  {
    id: 'saryeoni',
    name: '사려니숲길',
    area: 'east',
    km: 10,
    shape: 'line',
    level: 3,
    rough: '숲속 흙길이에요',
    feature: '삼나무 숲, 대표 구간은 약 4.8km',
    lat: 33.4433,
    lng: 126.6305,
  },
  {
    id: 'gasi-ttarabi',
    name: '가시리 → 따라비오름',
    area: 'east',
    km: 10,
    shape: 'line',
    level: 3,
    rough: '오름(언덕)이 있어요',
    feature: '들판과 오름을 함께 달려요',
    lat: 33.3872,
    lng: 126.7402,
  },
  {
    id: 'olle7',
    name: '올레 7코스 (외돌개 → 월평)',
    area: 'seogwipo',
    km: 15,
    shape: 'line',
    level: 3,
    rough: '바윗길·계단이 있어요',
    feature: '해안 절경 트레일',
    lat: 33.2401,
    lng: 126.5452,
  },
];

/** 소리로 읽기 좋은 이름: '함덕해수욕장 → 관곶' → '함덕해수욕장에서 관곶', 괄호 설명은 뺀다 */
export function spokenName(name: string): string {
  return name
    .replace(/\s*\(.*?\)\s*/g, ' ')
    .replace(/\s*→\s*/g, '에서 ')
    .trim();
}

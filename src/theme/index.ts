/**
 * 앱 전체 색상·글자 크기·간격을 한 곳에서 관리한다.
 * 40~50대도 읽기 쉽도록 글씨는 크게, 대비는 높게 잡았다.
 * 화면에서는 숫자를 직접 쓰지 말고 이 값을 가져다 쓴다.
 */

export const colors = {
  // 포인트 색 (러닝 오렌지). 흰 글씨를 올려도 큰 글씨 기준 대비를 만족하는 진한 톤.
  primary: '#D9480F',
  primaryPressed: '#B83A0A',
  // 포인트 색을 옅게 깐 배경 (말풍선, 강조 카드)
  primarySoft: '#FFF1EA',

  background: '#FFFFFF',
  surface: '#F5F5F7', // 카드 배경
  border: '#E2E2E6',

  text: '#111111', // 본문은 거의 검정
  textSecondary: '#4A4A4F', // 보조 글씨도 충분히 진하게
  textOnPrimary: '#FFFFFF',

  success: '#1F7A3A',
  warning: '#B25E00',
  danger: '#C62828',

  photoBackdrop: '#000000', // 사진 크게 보기 배경
} as const;

export const fontSize = {
  caption: 16, // 가장 작은 글씨도 16 이상
  body: 18,
  bodyLarge: 20,
  title: 24,
  heading: 30,
  number: 44, // 거리·시간 같은 핵심 숫자
  hero: 80, // 러닝 중 거리처럼 가장 중요한 숫자 하나
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radius = {
  md: 12,
  lg: 20,
} as const;

/** 버튼·터치 영역 최소 높이 */
export const touchHeight = 56;

/** 날짜를 DB 저장용 'YYYY-MM-DD'로 바꾼다 (휴대폰 시간대 기준) */
export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** 'YYYY-MM-DD' → Date (휴대폰 시간대의 그날 0시) */
export function fromISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** 'YYYY-MM-DD' → '2026년 10월 6일' */
export function formatDateLong(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${y}년 ${m}월 ${d}일`;
}

/** 'YYYY-MM-DD' → '10.6' (그래프 축처럼 좁은 곳) */
export function formatDateShort(iso: string): string {
  const [, m, d] = iso.split('-').map(Number);
  return `${m}.${d}`;
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

/** ISO 시각 → '10월 7일 (수) 오전 7:30 러닝' */
export function formatRunTitle(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours();
  const ampm = h < 12 ? '오전' : '오후';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAYS[d.getDay()]}) ${ampm} ${h12}:${mm} 러닝`;
}

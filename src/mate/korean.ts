/** 한국어 조사 고르기: 이름 끝 글자에 받침이 있는지에 따라 '이에요/예요', '이가/가' 등을 고른다. */

export function hasBatchim(word: string): boolean {
  const last = word.trim().slice(-1);
  if (!last) return false;
  const code = last.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return false; // 한글이 아니면 받침 없음으로 본다
  return (code - 0xac00) % 28 !== 0;
}

/** '달리예요' / '민준이에요' */
export const withIeyo = (name: string) => `${name}${hasBatchim(name) ? '이에요' : '예요'}`;

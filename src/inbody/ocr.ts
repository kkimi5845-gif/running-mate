/**
 * 인바디 결과지 사진에서 읽은 글자 → 수치 (순수 함수 — 단위 테스트 대상)
 *
 * 글자 읽기(OCR)는 휴대폰 안에서만 하고, 여기서는 읽은 글자에서 숫자만 골라낸다.
 * 결과지마다 배치가 달라 틀릴 수 있으므로, 애매하면 비워 두는 쪽을 고른다.
 * 채운 값은 사용자가 결과지와 비교해 확인한 뒤 저장한다.
 */
import { METRICS, type MetricKey } from './metrics';

/** 항목 이름 (한글 결과지와 영어 표기 모두) */
const LABELS: Record<MetricKey, RegExp> = {
  heightCm: /신장|Height|키(?=[\s\d])/gi,
  weightKg: /체중(?!\s*조절)|Weight(?!\s*Control)/gi,
  skeletalMuscleKg: /골격근량|Skeletal\s*Muscle\s*Mass|SMM/gi,
  bodyFatPct: /체지방률|Percent\s*Body\s*Fat|PBF/gi,
};

/** 다른 항목 이름이 나오면 거기서 멈춘다 (옆 항목의 숫자를 가져오지 않도록) */
const STOP =
  /신장|Height|체중|Weight|골격근량|Skeletal|SMM|체지방|Body\s*Fat|PBF|체수분|Body\s*Water|단백질|Protein|무기질|Mineral|제지방|BMI|복부지방|내장지방|근육량|기초대사/i;

/** 항목 이름 뒤에서 숫자를 찾는 범위 (글자 수) */
const WINDOW = 80;

const NUMBER = /(?<![\d.])\d{1,3}(?:\.\d{1,2})?(?![\d.])/g;

function normalize(text: string): string {
  return (
    text
      // 72,3 → 72.3
      .replace(/(\d),(\d)/g, '$1.$2')
      // 괄호 안(표준 범위 '55.0~74.5', 단위 '(kg)')은 지운다
      .replace(/\([^)]*\)/g, ' ')
      // 괄호 없이 쓴 범위 '55.0~74.5', '55.0-74.5'도 지운다
      .replace(/\d+(?:\.\d+)?\s*[~∼-]\s*\d+(?:\.\d+)?/g, ' ')
  );
}

function findValue(text: string, key: MetricKey): number | null {
  const metric = METRICS.find((m) => m.key === key)!;
  const label = new RegExp(LABELS[key].source, 'gi');
  for (const hit of text.matchAll(label)) {
    let windowText = text.slice(hit.index! + hit[0].length, hit.index! + hit[0].length + WINDOW);
    const stop = windowText.search(STOP);
    if (stop >= 0) windowText = windowText.slice(0, stop);
    for (const n of windowText.matchAll(NUMBER)) {
      const v = Number(n[0]);
      if (v >= metric.min && v <= metric.max) return v;
    }
  }
  return null;
}

/** 찾은 항목만 들어 있다. 하나도 못 찾으면 빈 객체 */
export function parseInbodyText(raw: string): Partial<Record<MetricKey, number>> {
  const text = normalize(raw);
  const out: Partial<Record<MetricKey, number>> = {};
  for (const m of METRICS) {
    const v = findValue(text, m.key);
    if (v !== null) out[m.key] = v;
  }
  return out;
}

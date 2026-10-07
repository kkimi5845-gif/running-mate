/**
 * 러닝메이트가 할 말 만들기.
 *
 * 지금은 문구 템플릿으로 만들지만, 나중에 LLM(AI) API로 바꿀 수 있도록
 * generateMateMessage(recommendation, tone) 모양을 지키고 비동기(Promise)로 둔다.
 * 어떤 방식이든 추천 내용 자체는 바꾸지 않고 "설명"만 한다.
 */
import type { Recommendation, Workout } from '@/engine/types';

import { withIeyo } from './korean';
import { COURSE_LINE, GREETING, INTENSITY_PHRASE, JEJU_LINE, REASON_LINES, REST_HEADLINE } from './templates';
import type { MateMessage, MateTone } from './types';

export type MateContext = {
  name?: string; // 러닝메이트 이름
  courseKm?: string | null; // 추천 코스 거리 (예: '2.1')
  jejuCourse?: string | null; // 추천 제주 코스 이름 (내 지난 코스가 없을 때만 말한다)
};

function workoutLine(w: Workout, total: number, tone: MateTone, intensity: string): string {
  const run = w.main.find((s) => s.kind === 'run');
  const walk = w.main.find((s) => s.kind === 'walk');
  const set = walk ? `달리기 ${run?.minutes ?? 0}분, 걷기 ${walk.minutes}분` : `달리기 ${run?.minutes ?? 0}분`;
  const how = walk ? (w.repeat > 1 ? `${w.repeat}번 반복해서` : '한 번') : '쭉 이어서';

  if (tone === 'cheerful') return `오늘 미션! ${set}을 ${how}, 총 ${total}분이에요. ${intensity} 가요!`;
  return `오늘은 ${set}을 ${how}, 모두 ${total}분 해 볼까요? ${intensity} 달려요.`;
}

export function buildMateMessage(rec: Recommendation, tone: MateTone, ctx: MateContext = {}): MateMessage {
  const lines: string[] = [];
  if (ctx.name) lines.push(GREETING[tone](withIeyo(ctx.name)));

  if (rec.rest || !rec.workout) {
    lines.push(REST_HEADLINE[tone]);
    for (const code of rec.reasons) lines.push(REASON_LINES[code][tone]);
  } else {
    lines.push(workoutLine(rec.workout, rec.totalMinutes, tone, INTENSITY_PHRASE[rec.intensity]));
    // 첫 이유(기본 구성 설명)는 위 문장과 겹치므로 조정 이유만 덧붙인다
    for (const code of rec.reasons.slice(1)) lines.push(REASON_LINES[code][tone]);
    if (ctx.courseKm) lines.push(COURSE_LINE[tone](ctx.courseKm));
    else if (ctx.jejuCourse) lines.push(JEJU_LINE[tone](ctx.jejuCourse));
  }

  return { lines, speech: lines.join(' ') };
}

/** 화면에서 쓰는 인터페이스. 나중에 LLM으로 바꿀 때 이 함수 안만 바꾸면 된다. */
export async function generateMateMessage(
  recommendation: Recommendation,
  tone: MateTone,
  ctx: MateContext = {},
): Promise<MateMessage> {
  return buildMateMessage(recommendation, tone, ctx);
}

/**
 * 달리는 중 음성 코칭 문구 (말투별). 짧고 또렷하게.
 * 의학적 판단 표현은 쓰지 않는다.
 */
import type { Cue } from '@/coach/cues';

import { withEuro, withIeyo } from './korean';
import type { MateTone } from './types';

const mins = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m === 0) return `${s}초`;
  return s === 0 ? `${m}분` : `${m}분 ${s}초`;
};

/** 페이스(초/km)를 말로: '6분 30초' */
export function paceSpeech(secPerKm: number): string {
  const total = Math.round(secPerKm);
  return `${Math.floor(total / 60)}분 ${total % 60}초`;
}

/** 달리는 중 응원 한마디. 씩씩한 말투에는 웃음이 나는 말도 섞었다. */
export const CHEERS: Record<MateTone, { half: string; almost: string; random: string[] }> = {
  gentle: {
    half: '벌써 반이나 왔어요. 지금처럼만 가요.',
    almost: '30초 남았어요. 조금만 더 힘내요.',
    random: [
      '잘하고 있어요. 지금 속도 그대로요.',
      '어깨 힘 빼고, 팔은 가볍게 흔들어요.',
      '숨이 차면 천천히 가도 괜찮아요.',
      '한 걸음 한 걸음이 다 쌓이고 있어요.',
      '오늘도 나와서 달리는 모습, 정말 멋져요.',
      '파이팅! 끝까지 함께할게요.',
    ],
  },
  cheerful: {
    half: '반 왔어요! 남은 반도 우리가 접수해요!',
    almost: '30초! 30초만 버티면 꿀 같은 걷기 시간이에요!',
    random: [
      '파이팅! 오늘 다리 컨디션 최고인데요?',
      '좋아요! 지금 이 길의 주인공은 바로 당신!',
      '힘들죠? 저도 힘들어요. 사실 저는 다리가 없지만요!',
      '어깨 펴고, 턱 당기고, 멋짐 장착!',
      '이 속도면 동네 바람도 따라오기 힘들겠어요!',
      '끝나고 마시는 물이 세상에서 제일 맛있대요. 조금만 더!',
      '파이팅! 러닝메이트가 옆에서 응원 중이에요!',
    ],
  },
};

export function cueSpeech(cue: Cue, tone: MateTone): string {
  const cheer = tone === 'cheerful';
  switch (cue.type) {
    case 'segment': {
      const s = cue.segment;
      const t = mins(s.seconds);
      if (s.phase === 'warmup') {
        return cheer ? `출발! 먼저 ${t} 걸으면서 몸을 풀어요!` : `준비 걷기 ${withEuro(t)} 시작해요. 천천히 걸어요.`;
      }
      if (s.phase === 'cooldown') {
        return cheer ? `잘했어요! 이제 ${t} 걸으면서 마무리해요.` : `마무리 걷기 ${withIeyo(t)}. 천천히 걸으며 숨을 골라요.`;
      }
      const setInfo =
        s.kind === 'run'
          ? cue.isLastSet
            ? cheer
              ? ' 마지막 세트예요!'
              : ' 마지막 세트예요.'
            : ` ${cue.sets}세트 중 ${s.set}세트예요.`
          : '';
      if (s.kind === 'run') {
        return cheer ? `달려요! ${t}!${setInfo}` : `이제 ${t} 달려요. 편한 속도로요.${setInfo}`;
      }
      return cheer ? `걷기! ${t} 동안 숨 돌려요!` : `걷기로 바꿔요. ${t} 걸으며 숨을 고르세요.`;
    }
    case 'planDone':
      return cheer
        ? '오늘 미션 완료! 끝내기를 눌러 기록을 저장해요!'
        : '오늘 운동을 모두 마쳤어요. 수고했어요. 끝내기를 눌러 기록을 저장하세요.';
    case 'cheer': {
      const c = CHEERS[tone];
      if (cue.kind === 'half') return c.half;
      if (cue.kind === 'almost') return c.almost;
      return c.random[(cue.n - 1) % c.random.length];
    }
    case 'km': {
      const pace = cue.avgPaceSecPerKm ? ` 평균 페이스는 ${withIeyo(paceSpeech(cue.avgPaceSecPerKm))}.` : '';
      return cheer ? `${cue.km}킬로미터 돌파!${pace}` : `${cue.km}킬로미터 지났어요.${pace}`;
    }
  }
}

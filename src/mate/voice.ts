import * as Speech from 'expo-speech';

import { duckMusic } from '@/music/player';

import type { MateTone } from './types';

/**
 * 러닝메이트 목소리: 휴대폰에 들어 있는 음성 읽기(TTS) 기능을 쓴다.
 * 인터넷 없이 동작하고, 읽을 문장을 밖으로 보내지 않는다.
 * 말투에 따라 빠르기와 높낮이만 조금 다르게 한다.
 */
const VOICE: Record<MateTone, { rate: number; pitch: number }> = {
  gentle: { rate: 0.95, pitch: 1.0 },
  cheerful: { rate: 1.05, pitch: 1.15 },
};

export function speak(text: string, tone: MateTone, onDone?: () => void): void {
  Speech.stop();
  Speech.speak(text, {
    language: 'ko-KR',
    ...VOICE[tone],
    onDone,
    onStopped: onDone,
    onError: onDone,
  });
}

export function stopSpeaking(): void {
  Speech.stop();
}

/**
 * 앞의 말을 끊지 않고 이어서 말한다 (달리는 중 안내용).
 * 말하는 동안 앱 배경음악 소리를 줄인다. 다른 음악 앱(멜론 등)은 안드로이드가 음성 안내 동안
 * 소리를 줄여 주는 경우가 많지만, 휴대폰·앱마다 다를 수 있다.
 */
export function speakQueued(text: string, tone: MateTone): void {
  Speech.speak(text, {
    language: 'ko-KR',
    ...VOICE[tone],
    onStart: () => duckMusic(true),
    onDone: () => duckMusic(false),
    onStopped: () => duckMusic(false),
    onError: () => duckMusic(false),
  });
}

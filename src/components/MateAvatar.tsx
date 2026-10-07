import Svg, { Circle, Ellipse, Path } from 'react-native-svg';

import type { MateTone } from '@/mate/types';
import { colors } from '@/theme';

/** 러닝메이트 얼굴: 주황색 동그라미 캐릭터. 씩씩한 말투면 더 크게 웃는다. */
export function MateAvatar({ tone, size = 64 }: { tone: MateTone; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" accessibilityLabel="러닝메이트">
      <Circle cx={32} cy={32} r={30} fill={colors.primary} />
      {/* 머리띠 */}
      <Path d="M8 22 Q32 10 56 22" stroke={colors.background} strokeWidth={5} fill="none" strokeLinecap="round" />
      {/* 눈 */}
      <Ellipse cx={23} cy={31} rx={3.2} ry={4} fill={colors.background} />
      <Ellipse cx={41} cy={31} rx={3.2} ry={4} fill={colors.background} />
      {/* 볼 */}
      <Circle cx={16} cy={40} r={3.5} fill={colors.primarySoft} opacity={0.6} />
      <Circle cx={48} cy={40} r={3.5} fill={colors.primarySoft} opacity={0.6} />
      {/* 입 */}
      {tone === 'cheerful' ? (
        <Path d="M22 40 Q32 52 42 40 Z" fill={colors.background} />
      ) : (
        <Path d="M24 42 Q32 48 40 42" stroke={colors.background} strokeWidth={3} fill="none" strokeLinecap="round" />
      )}
    </Svg>
  );
}

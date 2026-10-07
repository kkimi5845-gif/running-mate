import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { MateAvatar } from '@/components/MateAvatar';
import type { MateMessage, MateTone } from '@/mate/types';
import { speak, stopSpeaking } from '@/mate/voice';
import { colors, radius, spacing } from '@/theme';

type Props = {
  name: string;
  tone: MateTone;
  message: MateMessage;
  voiceOn: boolean;
};

/** 러닝메이트 캐릭터 + 말풍선 + 🔊 읽어 주기 */
export function MateBubble({ name, tone, message, voiceOn }: Props) {
  const [speaking, setSpeaking] = useState(false);

  // 화면을 떠나면 읽던 것을 멈춘다
  useEffect(() => () => stopSpeaking(), []);

  const toggleSpeak = () => {
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
      return;
    }
    setSpeaking(true);
    speak(message.speech, tone, () => setSpeaking(false));
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.who}>
        <MateAvatar tone={tone} size={60} />
        <AppText bold>{name}</AppText>
      </View>
      <View style={styles.bubbleCol}>
        <View style={styles.tail} />
        <View style={styles.bubble}>
          {message.lines.map((line, i) => (
            <AppText key={i} bold={i === 1}>
              {line}
            </AppText>
          ))}
          {voiceOn && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={speaking ? '읽기 멈추기' : '소리로 듣기'}
              onPress={toggleSpeak}
              style={({ pressed }) => [styles.speak, pressed && styles.speakPressed]}>
              <Ionicons name={speaking ? 'stop-circle' : 'volume-high'} size={24} color={colors.primary} />
              <AppText bold color={colors.primary}>
                {speaking ? '멈추기' : '소리로 듣기'}
              </AppText>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  who: {
    alignItems: 'center',
    gap: spacing.xs,
    width: 72,
  },
  bubbleCol: {
    flex: 1,
    flexDirection: 'row',
  },
  tail: {
    width: 0,
    height: 0,
    marginTop: 22,
    borderTopWidth: 10,
    borderBottomWidth: 10,
    borderRightWidth: 12,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderRightColor: colors.primarySoft,
  },
  bubble: {
    flex: 1,
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
  },
  speak: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.background,
  },
  speakPressed: {
    backgroundColor: colors.surface,
  },
});

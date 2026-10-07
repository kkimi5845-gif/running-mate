import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { Card } from '@/components/Card';
import { ChoiceButton } from '@/components/ChoiceButton';
import { MateAvatar } from '@/components/MateAvatar';
import { DEFAULT_MATE_NAME, getMateSettings, saveMateSettings, type MateSettings } from '@/db/settings';
import { withIeyo } from '@/mate/korean';
import { TONE_LABEL, type MateTone } from '@/mate/types';
import { speak, stopSpeaking } from '@/mate/voice';
import { colors, fontSize, radius, spacing, touchHeight } from '@/theme';
import { showError } from '@/utils/errors';

/** 러닝메이트 설정: 이름, 말투, 소리 */
export default function MateSettingsScreen() {
  const db = useSQLiteContext();
  const [s, setS] = useState<MateSettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getMateSettings(db).then(setS);
    return () => stopSpeaking();
  }, [db]);

  if (!s) return null;

  const preview = (tone: MateTone) => {
    const name = s.name.trim() || DEFAULT_MATE_NAME;
    speak(`안녕하세요, ${withIeyo(name)}. ${TONE_LABEL[tone].sample}`, tone);
  };

  const save = async () => {
    setSaving(true);
    try {
      await saveMateSettings(db, s);
      router.back();
    } catch (e) {
      setSaving(false);
      showError('저장하지 못했어요', e);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <MateAvatar tone={s.tone} size={96} />
          <AppText variant="title">{s.name.trim() || DEFAULT_MATE_NAME}</AppText>
        </View>

        <Card>
          <AppText variant="title">이름</AppText>
          <TextInput
            accessibilityLabel="러닝메이트 이름"
            value={s.name}
            onChangeText={(name) => setS({ ...s, name })}
            placeholder={DEFAULT_MATE_NAME}
            placeholderTextColor={colors.textSecondary}
            style={styles.input}
            maxLength={10}
          />
          <AppText variant="caption">비워 두면 &quot;{DEFAULT_MATE_NAME}&quot;로 불러요. 10글자까지 쓸 수 있어요.</AppText>
        </Card>

        <Card>
          <AppText variant="title">말투</AppText>
          {(Object.keys(TONE_LABEL) as MateTone[]).map((tone) => (
            <View key={tone} style={styles.toneRow}>
              <ChoiceButton
                label={`${TONE_LABEL[tone].title} — "${TONE_LABEL[tone].sample}"`}
                selected={s.tone === tone}
                onPress={() => setS({ ...s, tone })}
              />
              <BigButton label="🔊 미리 듣기" variant="outline" onPress={() => preview(tone)} />
            </View>
          ))}
        </Card>

        <Card>
          <AppText variant="title">소리</AppText>
          <ChoiceButton label="소리로 읽어 주기 켜기" selected={s.voiceOn} onPress={() => setS({ ...s, voiceOn: true })} />
          <ChoiceButton label="글자로만 보기" selected={!s.voiceOn} onPress={() => setS({ ...s, voiceOn: false })} />
          <AppText variant="caption">
            휴대폰에 들어 있는 음성 읽기 기능을 써요. 인터넷 없이 동작하고, 내용을 밖으로 보내지 않아요. 소리가 안
            나면 휴대폰 음량을 확인해 주세요.
          </AppText>
        </Card>

        <BigButton label={saving ? '저장하는 중…' : '저장하기'} disabled={saving} onPress={save} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  hero: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  input: {
    minHeight: touchHeight,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: fontSize.bodyLarge,
    color: colors.text,
    backgroundColor: colors.background,
  },
  toneRow: {
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
});

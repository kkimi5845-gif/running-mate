import Ionicons from '@expo/vector-icons/Ionicons';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { Card } from '@/components/Card';
import { addTrack, deleteTrack, listTracks } from '@/db/music';
import { deleteMusicFile, pickMusicFiles } from '@/music/files';
import { previewTrack, stopMusic } from '@/music/player';
import type { MusicKind, Track } from '@/music/select';
import { colors, radius, spacing } from '@/theme';
import { showError } from '@/utils/errors';

const SECTIONS: { kind: MusicKind; title: string; hint: string }[] = [
  { kind: 'walk', title: '걷기 음악', hint: '준비·마무리 걷기와 걷기 구간에 나와요. 잔잔한 곡을 추천해요.' },
  { kind: 'run', title: '달리기 음악', hint: '달리기 구간과 자유 러닝에 나와요. 신나는 곡을 추천해요.' },
];

/** 러닝 배경음악: 내 휴대폰의 음악 파일을 걷기/달리기 목록에 넣는다 */
export default function MusicScreen() {
  const db = useSQLiteContext();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [playingId, setPlayingId] = useState<number | null>(null);

  const load = useCallback(() => listTracks(db).then(setTracks), [db]);

  useEffect(() => {
    void load();
    return () => stopMusic(); // 화면을 나가면 미리 듣기 멈춤
  }, [load]);

  const add = async (kind: MusicKind) => {
    try {
      const picked = await pickMusicFiles();
      for (const f of picked) await addTrack(db, kind, f.name, f.uri);
      await load();
    } catch (e) {
      showError('음악을 넣지 못했어요', e, 'mp3 같은 음악 파일인지 확인하고 다시 골라 주세요.');
    }
  };

  const remove = (t: Track) => {
    Alert.alert('이 곡을 뺄까요?', `"${t.name}"을(를) 목록에서 빼요. 휴대폰의 원래 파일은 그대로예요.`, [
      { text: '취소', style: 'cancel' },
      {
        text: '빼기',
        style: 'destructive',
        onPress: async () => {
          if (playingId === t.id) {
            await previewTrack(null);
            setPlayingId(null);
          }
          await deleteTrack(db, t.id);
          deleteMusicFile(t.uri);
          await load();
        },
      },
    ]);
  };

  const togglePreview = async (t: Track) => {
    if (playingId === t.id) {
      await previewTrack(null);
      setPlayingId(null);
    } else {
      await previewTrack(t.uri);
      setPlayingId(t.id);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <AppText variant="caption">
        휴대폰에 저장된 음악 파일(mp3 등)을 넣어 두면, 러닝 중 걷기·달리기 구간에 맞춰 바꿔 틀어 드려요. 한쪽 목록만
        채워도 괜찮아요. 음악 파일은 이 휴대폰 안에만 저장돼요.
      </AppText>

      {SECTIONS.map((sec) => {
        const list = tracks.filter((t) => t.kind === sec.kind);
        return (
          <Card key={sec.kind}>
            <AppText variant="title">
              {sec.title} ({list.length}곡)
            </AppText>
            <AppText variant="caption">{sec.hint}</AppText>
            {list.map((t) => (
              <View key={t.id} style={styles.row}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={playingId === t.id ? `${t.name} 멈추기` : `${t.name} 미리 듣기`}
                  onPress={() => togglePreview(t)}
                  style={styles.iconBtn}>
                  <Ionicons name={playingId === t.id ? 'stop-circle' : 'play-circle'} size={36} color={colors.primary} />
                </Pressable>
                <AppText style={styles.name} numberOfLines={2}>
                  {t.name}
                </AppText>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${t.name} 빼기`}
                  onPress={() => remove(t)}
                  style={styles.iconBtn}>
                  <Ionicons name="trash-outline" size={26} color={colors.textSecondary} />
                </Pressable>
              </View>
            ))}
            <BigButton label={`+ ${sec.title} 넣기`} variant="outline" onPress={() => add(sec.kind)} />
          </Card>
        );
      })}

      <Card>
        <AppText variant="title">다른 음악 앱과 함께 쓰기</AppText>
        <AppText variant="caption">
          멜론·유튜브 뮤직 같은 앱으로 음악을 들으면서 달려도 돼요. 이때는 러닝 시작 화면에서 &quot;음악 없이&quot;를
          고르세요. 안내 음성이 나올 때 음악 소리가 잠깐 작아지는지는 휴대폰과 앱에 따라 다를 수 있어요.
        </AppText>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xl * 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.background,
  },
  iconBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    flex: 1,
  },
});

import Ionicons from '@expo/vector-icons/Ionicons';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { Card } from '@/components/Card';
import { Disclaimer } from '@/components/Disclaimer';
import { NumberField } from '@/components/NumberField';
import { deleteInbody, getInbody, insertInbody, latestInbody, updateInbody } from '@/db/inbody';
import { METRICS, parseNumber, type MetricKey } from '@/inbody/metrics';
import { canReadPhoto, readInbodyPhoto } from '@/inbody/readPhoto';
import { deletePhoto, permissionMessage, pickPhoto, type PickSource } from '@/photos/photo';
import { colors, radius, spacing } from '@/theme';
import { formatDateLong, fromISODate, toISODate } from '@/utils/date';
import { showError } from '@/utils/errors';

type Texts = Record<MetricKey, string>;

const EMPTY: Texts = { heightCm: '', weightKg: '', bodyFatPct: '', skeletalMuscleKg: '' };

const toText = (v: number | null) => (v === null ? '' : String(v));

/** 인바디 기록 입력·수정. 결과지 사진을 위에 띄워 두고 보면서 숫자를 입력한다. */
export default function InbodyEditScreen() {
  const db = useSQLiteContext();
  const { id: idParam } = useLocalSearchParams<{ id?: string }>();
  const editingId = idParam ? Number(idParam) : null;

  const [loaded, setLoaded] = useState(false);
  const [date, setDate] = useState(toISODate(new Date()));
  const [texts, setTexts] = useState<Texts>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<MetricKey, string>>>({});
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [showIOSDate, setShowIOSDate] = useState(false);
  const [zoom, setZoom] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reading, setReading] = useState(false);
  const [autoFilled, setAutoFilled] = useState<MetricKey[]>([]);

  // 화면을 떠날 때 저장하지 않은 새 사진 파일을 정리하기 위해 기억해 둔다.
  const originalPhoto = useRef<string | null>(null);
  const currentPhoto = useRef<string | null>(null);
  const saved = useRef(false);
  useEffect(() => {
    currentPhoto.current = photoUri;
  }, [photoUri]);

  useEffect(() => {
    (async () => {
      if (editingId !== null) {
        const log = await getInbody(db, editingId);
        if (log) {
          setDate(log.measuredOn);
          setTexts({
            heightCm: toText(log.heightCm),
            weightKg: toText(log.weightKg),
            bodyFatPct: toText(log.bodyFatPct),
            skeletalMuscleKg: toText(log.skeletalMuscleKg),
          });
          setPhotoUri(log.photoUri);
          originalPhoto.current = log.photoUri;
        }
      } else {
        // 새 기록: 키는 잘 안 바뀌니 지난 기록의 키를 미리 채워 둔다
        const last = await latestInbody(db);
        if (last?.heightCm) setTexts({ ...EMPTY, heightCm: String(last.heightCm) });
      }
      setLoaded(true);
    })();

    return () => {
      if (!saved.current && currentPhoto.current !== originalPhoto.current) {
        deletePhoto('inbody', currentPhoto.current);
      }
    };
  }, [db, editingId]);

  const addPhoto = async (source: PickSource) => {
    try {
      const result = await pickPhoto('inbody', source);
      if (!result.ok) {
        if (result.reason === 'denied') {
          Alert.alert('사진 권한이 필요해요', permissionMessage(source));
        }
        return;
      }
      // 이번에 새로 고른 사진을 다시 바꾸면, 바로 전 사진 파일은 지운다
      if (photoUri && photoUri !== originalPhoto.current) deletePhoto('inbody', photoUri);
      setPhotoUri(result.uri);
    } catch (e) {
      showError('사진을 가져오지 못했어요', e);
    }
  };

  /** 결과지 사진에서 숫자를 읽어 입력칸을 채운다. 찾은 항목만 바꾸고, 사용자가 확인 후 저장한다. */
  const readFromPhoto = async () => {
    if (!photoUri) return;
    setReading(true);
    try {
      const found = await readInbodyPhoto(photoUri);
      const keys = METRICS.map((m) => m.key).filter((k) => found[k] !== undefined);
      if (keys.length === 0) {
        Alert.alert(
          '숫자를 찾지 못했어요',
          '결과지가 화면에 꽉 차게, 밝은 곳에서 흔들리지 않게 다시 찍어 보세요. 직접 입력해도 괜찮아요.',
        );
        return;
      }
      setTexts((prev) => {
        const next = { ...prev };
        for (const k of keys) next[k] = String(found[k]);
        return next;
      });
      setErrors({});
      setAutoFilled(keys);
      const labels = METRICS.filter((m) => keys.includes(m.key)).map((m) => m.label);
      Alert.alert(
        `${labels.length}개 항목을 채웠어요`,
        `${labels.join(', ')}
사진에서 읽은 값은 틀릴 수 있어요. 결과지와 같은지 꼭 확인한 뒤 저장해 주세요.`,
      );
    } catch (e) {
      showError('사진에서 숫자를 읽지 못했어요', e, '직접 입력해 주세요.');
    } finally {
      setReading(false);
    }
  };

  const removePhoto = () => {
    if (photoUri && photoUri !== originalPhoto.current) deletePhoto('inbody', photoUri);
    setPhotoUri(null);
  };

  const openDatePicker = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: fromISODate(date),
        mode: 'date',
        maximumDate: new Date(),
        onChange: (event, picked) => {
          if (event.type === 'set' && picked) setDate(toISODate(picked));
        },
      });
    } else {
      setShowIOSDate((v) => !v);
    }
  };

  const save = async () => {
    const values = {} as Record<MetricKey, number | null>;
    const nextErrors: Partial<Record<MetricKey, string>> = {};
    for (const m of METRICS) {
      const v = parseNumber(texts[m.key]);
      if (v !== null && (Number.isNaN(v) || v < m.min || v > m.max)) {
        nextErrors[m.key] = `${m.min}~${m.max}${m.unit} 사이의 숫자로 입력해 주세요.`;
      }
      values[m.key] = v;
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const hasAnyValue = METRICS.some((m) => values[m.key] !== null);
    if (!hasAnyValue && !photoUri) {
      Alert.alert('입력한 내용이 없어요', '수치를 하나 이상 입력하거나 결과지 사진을 첨부해 주세요.');
      return;
    }

    setSaving(true);
    try {
      const input = { measuredOn: date, ...values, photoUri };
      if (editingId !== null) await updateInbody(db, editingId, input);
      else await insertInbody(db, input);
      saved.current = true;
      // 사진을 바꿨거나 뺐다면 예전 사진 파일 정리
      if (originalPhoto.current && originalPhoto.current !== photoUri) {
        deletePhoto('inbody', originalPhoto.current);
      }
      router.back();
    } catch (e) {
      setSaving(false);
      showError('저장하지 못했어요', e);
    }
  };

  const remove = () => {
    if (editingId === null) return;
    Alert.alert('이 기록을 지울까요?', '지운 기록과 사진은 되살릴 수 없어요.', [
      { text: '취소', style: 'cancel' },
      {
        text: '지우기',
        style: 'destructive',
        onPress: async () => {
          await deleteInbody(db, editingId);
          saved.current = true;
          deletePhoto('inbody', originalPhoto.current);
          if (photoUri !== originalPhoto.current) deletePhoto('inbody', photoUri);
          router.back();
        },
      },
    ]);
  };

  if (!loaded) return null;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: editingId !== null ? '인바디 수정' : '인바디 입력' }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Disclaimer />

        {/* 결과지 사진 */}
        <Card>
          <AppText variant="title">결과지 사진</AppText>
          {photoUri ? (
            <>
              <Pressable
                accessibilityRole="imagebutton"
                accessibilityLabel="결과지 사진 크게 보기"
                onPress={() => setZoom(true)}>
                <Image source={{ uri: photoUri }} style={styles.photo} contentFit="contain" />
                <AppText variant="caption" style={styles.center}>
                  사진을 누르면 크게 볼 수 있어요
                </AppText>
              </Pressable>
              {canReadPhoto ? (
                <BigButton
                  label={reading ? '사진을 읽는 중…' : '사진에서 숫자 읽기'}
                  disabled={reading}
                  onPress={readFromPhoto}
                />
              ) : (
                <AppText variant="caption">
                  사진에서 숫자를 자동으로 읽는 기능은 러닝메이트 앱(개발용 빌드)에서 쓸 수 있어요.
                </AppText>
              )}
              <View style={styles.buttonRow}>
                <View style={styles.flex}>
                  <BigButton label="다른 사진" variant="outline" onPress={() => addPhoto('library')} />
                </View>
                <View style={styles.flex}>
                  <BigButton label="사진 빼기" variant="outline" onPress={removePhoto} />
                </View>
              </View>
            </>
          ) : (
            <>
              <AppText variant="caption">
                사진은 이 휴대폰 안에만 저장돼요. 사진을 보면서 아래 숫자를 입력하거나, 사진에서 숫자를 읽어 올 수 있어요.
              </AppText>
              <View style={styles.buttonRow}>
                <View style={styles.flex}>
                  <BigButton label="사진 찍기" variant="outline" onPress={() => addPhoto('camera')} />
                </View>
                <View style={styles.flex}>
                  <BigButton label="앨범에서" variant="outline" onPress={() => addPhoto('library')} />
                </View>
              </View>
            </>
          )}
        </Card>

        {/* 날짜 */}
        <Card>
          <AppText variant="title">측정 날짜</AppText>
          <Pressable
            accessibilityRole="button"
            accessibilityHint="눌러서 날짜 바꾸기"
            onPress={openDatePicker}
            style={styles.dateRow}>
            <Ionicons name="calendar" size={26} color={colors.primary} />
            <AppText variant="bodyLarge" bold style={styles.flex}>
              {formatDateLong(date)}
            </AppText>
            <AppText color={colors.primary} bold>
              바꾸기
            </AppText>
          </Pressable>
          {showIOSDate && (
            <DateTimePicker
              value={fromISODate(date)}
              mode="date"
              display="inline"
              maximumDate={new Date()}
              onChange={(_, picked) => picked && setDate(toISODate(picked))}
            />
          )}
        </Card>

        {/* 수치 */}
        <Card>
          <AppText variant="title">수치 (모두 선택 입력)</AppText>
          {autoFilled.length > 0 && (
            <AppText variant="caption" color={colors.text}>
              사진에서 읽은 값: {METRICS.filter((m) => autoFilled.includes(m.key)).map((m) => m.label).join(', ')}
              {'\n'}결과지와 같은지 확인해 주세요.
            </AppText>
          )}
          {METRICS.map((m) => (
            <NumberField
              key={m.key}
              label={m.label}
              unit={m.unit}
              value={texts[m.key]}
              error={errors[m.key]}
              onChangeText={(t) => {
                setTexts((prev) => ({ ...prev, [m.key]: t }));
                setAutoFilled((prev) => prev.filter((k) => k !== m.key));
              }}
            />
          ))}
        </Card>

        <BigButton label={saving ? '저장하는 중…' : '저장하기'} disabled={saving} onPress={save} />
        {editingId !== null && <BigButton label="이 기록 지우기" variant="outline" onPress={remove} />}
      </ScrollView>

      {/* 사진 크게 보기 */}
      <Modal visible={zoom} animationType="fade" onRequestClose={() => setZoom(false)}>
        <SafeAreaView style={styles.zoomWrap}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.flex} contentFit="contain" />
          ) : null}
          <View style={styles.zoomFooter}>
            <BigButton label="닫기" onPress={() => setZoom(false)} />
          </View>
        </SafeAreaView>
      </Modal>
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
  photo: {
    width: '100%',
    height: 320,
    borderRadius: radius.md,
    backgroundColor: colors.background,
  },
  center: {
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 56,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  zoomWrap: {
    flex: 1,
    backgroundColor: colors.photoBackdrop,
  },
  zoomFooter: {
    padding: spacing.lg,
  },
});

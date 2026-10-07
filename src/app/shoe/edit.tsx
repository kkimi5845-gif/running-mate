import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { BigButton } from '@/components/BigButton';
import { Card } from '@/components/Card';
import { NumberField } from '@/components/NumberField';
import { deleteShoe, getShoe, insertShoe, setShoeRetired, updateShoe, type Shoe } from '@/db/shoes';
import { parseNumber } from '@/inbody/metrics';
import { deletePhoto, permissionMessage, pickPhoto, type PickSource } from '@/photos/photo';
import { DEFAULT_REPLACE_KM } from '@/shoes/status';
import { colors, fontSize, radius, spacing, touchHeight } from '@/theme';
import { showError } from '@/utils/errors';

/** 신발 등록·수정 */
export default function ShoeEditScreen() {
  const db = useSQLiteContext();
  const { id: idParam } = useLocalSearchParams<{ id?: string }>();
  const editingId = idParam ? Number(idParam) : null;

  const [loaded, setLoaded] = useState(editingId === null);
  const [shoe, setShoe] = useState<Shoe | null>(null);
  const [name, setName] = useState('');
  const [replaceText, setReplaceText] = useState(String(DEFAULT_REPLACE_KM));
  const [initialText, setInitialText] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ name?: string; replace?: string; initial?: string }>({});
  const [saving, setSaving] = useState(false);

  // 저장하지 않고 나가면 새로 고른 사진 파일을 정리한다
  const originalPhoto = useRef<string | null>(null);
  const currentPhoto = useRef<string | null>(null);
  const saved = useRef(false);
  useEffect(() => {
    currentPhoto.current = photoUri;
  }, [photoUri]);

  useEffect(() => {
    if (editingId !== null) {
      getShoe(db, editingId).then((s) => {
        if (s) {
          setShoe(s);
          setName(s.name);
          setReplaceText(String(s.replaceKm));
          setInitialText(s.initialKm ? String(s.initialKm) : '');
          setPhotoUri(s.photoUri);
          originalPhoto.current = s.photoUri;
        }
        setLoaded(true);
      });
    }
    return () => {
      if (!saved.current && currentPhoto.current !== originalPhoto.current) {
        deletePhoto('shoes', currentPhoto.current);
      }
    };
  }, [db, editingId]);

  const addPhoto = async (source: PickSource) => {
    try {
      const result = await pickPhoto('shoes', source);
      if (!result.ok) {
        if (result.reason === 'denied') Alert.alert('사진 권한이 필요해요', permissionMessage(source));
        return;
      }
      if (photoUri && photoUri !== originalPhoto.current) deletePhoto('shoes', photoUri);
      setPhotoUri(result.uri);
    } catch (e) {
      showError('사진을 가져오지 못했어요', e);
    }
  };

  const removePhoto = () => {
    if (photoUri && photoUri !== originalPhoto.current) deletePhoto('shoes', photoUri);
    setPhotoUri(null);
  };

  const save = async () => {
    const replaceKm = parseNumber(replaceText);
    const initialKm = parseNumber(initialText);
    const next: typeof errors = {};
    if (name.trim() === '') next.name = '신발 이름을 입력해 주세요. (예: 나이키 페가수스 41)';
    if (replaceKm === null || Number.isNaN(replaceKm) || replaceKm < 50 || replaceKm > 3000) {
      next.replace = '50~3000km 사이의 숫자로 입력해 주세요.';
    }
    if (initialKm !== null && (Number.isNaN(initialKm) || initialKm > 5000)) {
      next.initial = '0~5000km 사이의 숫자로 입력해 주세요.';
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSaving(true);
    try {
      const input = { name: name.trim(), photoUri, replaceKm: replaceKm!, initialKm: initialKm ?? 0 };
      if (editingId !== null) await updateShoe(db, editingId, input);
      else await insertShoe(db, input);
      saved.current = true;
      if (originalPhoto.current && originalPhoto.current !== photoUri) deletePhoto('shoes', originalPhoto.current);
      router.back();
    } catch (e) {
      setSaving(false);
      showError('저장하지 못했어요', e);
    }
  };

  const toggleRetired = async () => {
    if (!shoe) return;
    await setShoeRetired(db, shoe.id, !shoe.retired);
    router.back();
  };

  const remove = () => {
    if (!shoe) return;
    Alert.alert(
      '이 신발을 지울까요?',
      '러닝 기록은 그대로 남지만, 이 신발과의 연결은 사라져요. 더 이상 안 신는 신발이라면 "보관하기"를 권해요.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '지우기',
          style: 'destructive',
          onPress: async () => {
            await deleteShoe(db, shoe.id);
            saved.current = true;
            deletePhoto('shoes', originalPhoto.current);
            if (photoUri !== originalPhoto.current) deletePhoto('shoes', photoUri);
            router.back();
          },
        },
      ],
    );
  };

  if (!loaded) return null;

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: editingId !== null ? '신발 수정' : '신발 등록' }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Card>
          <AppText variant="title">신발 이름</AppText>
          <TextInput
            accessibilityLabel="신발 이름"
            value={name}
            onChangeText={setName}
            placeholder="예: 나이키 페가수스 41"
            placeholderTextColor={colors.textSecondary}
            style={[styles.input, errors.name ? styles.inputError : null]}
            maxLength={40}
          />
          {errors.name ? <AppText color={colors.danger}>{errors.name}</AppText> : null}
        </Card>

        <Card>
          <AppText variant="title">사진 (선택)</AppText>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.photo} contentFit="cover" />
          ) : (
            <AppText variant="caption">신발 사진이 있으면 고르기 쉬워요. 사진은 이 휴대폰 안에만 저장돼요.</AppText>
          )}
          <View style={styles.buttonRow}>
            <View style={styles.flex}>
              <BigButton label="사진 찍기" variant="outline" onPress={() => addPhoto('camera')} />
            </View>
            <View style={styles.flex}>
              <BigButton label="앨범에서" variant="outline" onPress={() => addPhoto('library')} />
            </View>
          </View>
          {photoUri && <BigButton label="사진 빼기" variant="outline" onPress={removePhoto} />}
        </Card>

        <Card>
          <AppText variant="title">거리</AppText>
          <NumberField
            label="교체 권장"
            unit="km"
            value={replaceText}
            onChangeText={setReplaceText}
            error={errors.replace}
            placeholder={String(DEFAULT_REPLACE_KM)}
          />
          <AppText variant="caption">
            보통 러닝화는 500~800km 정도 신으면 쿠션이 줄어들어요. 기본값은 {DEFAULT_REPLACE_KM}km예요.
          </AppText>
          <NumberField
            label="이미 달린 거리"
            unit="km"
            value={initialText}
            onChangeText={setInitialText}
            error={errors.initial}
            placeholder="0"
          />
          <AppText variant="caption">앱을 쓰기 전에 이 신발로 달린 거리예요. 모르면 비워 두세요.</AppText>
        </Card>

        {shoe && (
          <Card>
            <AppText variant="caption">
              지금까지 이 앱에서 {shoe.runCount}회, {shoe.runKm.toFixed(1)}km 달렸어요.
            </AppText>
          </Card>
        )}

        <BigButton label={saving ? '저장하는 중…' : '저장하기'} disabled={saving} onPress={save} />
        {shoe && (
          <BigButton
            label={shoe.retired ? '다시 신기 (보관 해제)' : '보관하기 (더 이상 안 신어요)'}
            variant="outline"
            onPress={toggleRetired}
          />
        )}
        {shoe && <BigButton label="이 신발 지우기" variant="outline" onPress={remove} />}
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
  inputError: {
    borderColor: colors.danger,
  },
  photo: {
    width: '100%',
    height: 200,
    borderRadius: radius.md,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});

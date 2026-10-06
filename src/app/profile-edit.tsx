import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';

import { ProfileWizard } from '@/components/ProfileWizard';
import { getProfile, saveProfile } from '@/db/profile';
import type { Profile } from '@/profile/options';

/** 내 정보 → 프로필 수정: 온보딩과 같은 질문을 이전 답이 선택된 상태로 보여준다. */
export default function ProfileEditScreen() {
  const db = useSQLiteContext();
  const [initial, setInitial] = useState<Profile | null | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getProfile(db).then(setInitial);
  }, [db]);

  if (initial === undefined) return null;

  const finish = async (profile: Profile) => {
    setSaving(true);
    try {
      await saveProfile(db, profile);
      router.back();
    } catch (e) {
      setSaving(false);
      Alert.alert('저장하지 못했어요', '잠시 후 다시 시도해 주세요.\n' + String(e));
    }
  };

  return (
    <ProfileWizard
      initial={initial}
      finishLabel="저장하기"
      saving={saving}
      onFinish={finish}
      onCancel={() => router.back()}
    />
  );
}

import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Alert } from 'react-native';

import { ProfileWizard } from '@/components/ProfileWizard';
import { saveProfile } from '@/db/profile';
import type { Profile } from '@/profile/options';

/** 앱을 처음 켰을 때 한 번 나오는 질문 화면 */
export default function OnboardingScreen() {
  const db = useSQLiteContext();
  const [saving, setSaving] = useState(false);

  const finish = async (profile: Profile) => {
    setSaving(true);
    try {
      await saveProfile(db, profile);
      router.replace('/');
    } catch (e) {
      setSaving(false);
      Alert.alert('저장하지 못했어요', '잠시 후 다시 시도해 주세요.\n' + String(e));
    }
  };

  return <ProfileWizard finishLabel="시작하기" saving={saving} onFinish={finish} />;
}

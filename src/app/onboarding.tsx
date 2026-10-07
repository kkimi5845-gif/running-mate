import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';

import { ProfileWizard } from '@/components/ProfileWizard';
import { saveProfile } from '@/db/profile';
import type { Profile } from '@/profile/options';
import { showError } from '@/utils/errors';

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
      showError('저장하지 못했어요', e);
    }
  };

  return <ProfileWizard finishLabel="시작하기" saving={saving} onFinish={finish} />;
}

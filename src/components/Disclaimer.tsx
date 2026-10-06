import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { DISCLAIMER } from '@/constants/notices';
import { colors, radius, spacing } from '@/theme';

/** 인바디·추천 화면에 반드시 보여주는 안내 문구 */
export function Disclaimer() {
  return (
    <View style={styles.box} accessibilityRole="text">
      <Ionicons name="information-circle" size={24} color={colors.textSecondary} />
      <AppText variant="caption" style={styles.text}>
        {DISCLAIMER}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  text: {
    flex: 1,
    color: colors.text,
  },
});

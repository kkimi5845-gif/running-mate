import { StyleSheet, Text, type TextProps } from 'react-native';

import { colors, fontSize } from '@/theme';

type Variant = 'body' | 'bodyLarge' | 'caption' | 'title' | 'heading' | 'number' | 'hero';

type Props = TextProps & {
  variant?: Variant;
  color?: string;
  bold?: boolean;
};

/** 앱의 모든 글씨는 이 컴포넌트를 쓴다. 크기·색이 테마와 자동으로 맞춰진다. */
export function AppText({ variant = 'body', color, bold, style, ...rest }: Props) {
  return (
    <Text
      style={[
        styles.base,
        styles[variant],
        bold && styles.bold,
        color ? { color } : null,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    color: colors.text,
    fontSize: fontSize.body,
    lineHeight: fontSize.body * 1.5,
  },
  body: {},
  bodyLarge: {
    fontSize: fontSize.bodyLarge,
    lineHeight: fontSize.bodyLarge * 1.5,
  },
  caption: {
    fontSize: fontSize.caption,
    lineHeight: fontSize.caption * 1.5,
    color: colors.textSecondary,
  },
  title: {
    fontSize: fontSize.title,
    lineHeight: fontSize.title * 1.35,
    fontWeight: '700',
  },
  heading: {
    fontSize: fontSize.heading,
    lineHeight: fontSize.heading * 1.3,
    fontWeight: '800',
  },
  number: {
    fontSize: fontSize.number,
    lineHeight: fontSize.number * 1.2,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  hero: {
    fontSize: fontSize.hero,
    lineHeight: fontSize.hero * 1.1,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  bold: {
    fontWeight: '700',
  },
});

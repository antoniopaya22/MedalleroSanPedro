import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { useTheme } from '@/theme';
import type { TextVariant } from '@/theme/typography';
import type { ThemeColors } from '@/theme/colors';

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  color?: keyof ThemeColors;
  align?: 'auto' | 'left' | 'right' | 'center' | 'justify';
}

export function Text({ variant = 'body', color = 'textPrimary', align, style, ...rest }: TextProps) {
  const { typography, colors } = useTheme();

  return (
    <RNText
      style={[
        typography[variant],
        { color: colors[color], textAlign: align },
        style,
      ]}
      {...rest}
    />
  );
}

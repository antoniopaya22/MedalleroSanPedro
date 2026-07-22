import { View } from 'react-native';

import { useTheme } from '@/theme';
import type { ThemeColors } from '@/theme/colors';
import { Text } from './Text';

export type BadgeVariant = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info';

const VARIANT_COLOR: Record<BadgeVariant, keyof ThemeColors> = {
  neutral: 'textSecondary',
  primary: 'primary',
  success: 'success',
  warning: 'warning',
  danger: 'danger',
  info: 'info',
};

export interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
}

export function Badge({ label, variant = 'neutral' }: BadgeProps) {
  const { colors, radius, spacing } = useTheme();
  const tint = colors[VARIANT_COLOR[variant]];

  return (
    <View
      style={{
        alignSelf: 'flex-start',
        backgroundColor: variant === 'neutral' ? colors.surfaceAlt : `${tint}22`,
        borderRadius: radius.pill,
        paddingVertical: spacing.xxs / 2,
        paddingHorizontal: spacing.xs,
      }}
    >
      <Text variant="caption" style={{ color: tint }}>
        {label}
      </Text>
    </View>
  );
}

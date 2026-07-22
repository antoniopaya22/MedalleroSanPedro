import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

export interface CardProps {
  children: React.ReactNode;
  variant?: 'elevated' | 'outlined' | 'flat';
  padding?: number;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function Card({ children, variant = 'elevated', padding, onPress, style }: CardProps) {
  const { colors, radius, spacing, shadows } = useTheme();

  const baseStyle: StyleProp<ViewStyle> = [
    {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: padding ?? spacing.md,
    },
    variant === 'elevated' && shadows.sm,
    variant === 'outlined' && { borderWidth: 1, borderColor: colors.border },
    style,
  ];

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        style={({ pressed }) => [baseStyle, { opacity: pressed ? 0.9 : 1 }]}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={baseStyle}>{children}</View>;
}

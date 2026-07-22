import { Ionicons } from '@expo/vector-icons';
import { Pressable } from 'react-native';

import { useTheme } from '@/theme';

export interface IconButtonProps {
  name: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  variant?: 'filled' | 'ghost';
  size?: number;
  accessibilityLabel: string;
}

export function IconButton({ name, onPress, variant = 'ghost', size = 22, accessibilityLabel }: IconButtonProps) {
  const { colors, radius, touchTarget } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      style={({ pressed }) => [
        {
          width: touchTarget.min,
          height: touchTarget.min,
          borderRadius: radius.pill,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: variant === 'filled' ? colors.surfaceAlt : 'transparent',
          opacity: pressed ? 0.6 : 1,
        },
      ]}
    >
      <Ionicons name={name} size={size} color={colors.textPrimary} />
    </Pressable>
  );
}

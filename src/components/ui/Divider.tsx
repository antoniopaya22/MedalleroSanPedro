import { View } from 'react-native';

import { useTheme } from '@/theme';

export function Divider({ spacing: verticalSpacing }: { spacing?: number }) {
  const { colors, spacing } = useTheme();

  return (
    <View
      style={{
        height: 1,
        backgroundColor: colors.border,
        marginVertical: verticalSpacing ?? spacing.sm,
      }}
    />
  );
}

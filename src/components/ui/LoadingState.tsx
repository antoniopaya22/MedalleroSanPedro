import { ActivityIndicator, View } from 'react-native';

import { useTheme } from '@/theme';
import { Text } from './Text';

export interface LoadingStateProps {
  label?: string;
}

/** Centrado vertical + spinner, para sustituir un `<Text>Cargando…</Text>` suelto. */
export function LoadingState({ label = 'Cargando…' }: LoadingStateProps) {
  const { colors, spacing } = useTheme();

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm }}>
      <ActivityIndicator color={colors.primary} />
      <Text variant="body" color="textSecondary">
        {label}
      </Text>
    </View>
  );
}

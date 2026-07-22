import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import { useTheme } from '@/theme';
import { Button } from './Button';
import { Text } from './Text';

export interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
}

/** Aviso de fallo de carga (no de validación de formulario) con reintento opcional. */
export function ErrorBanner({ message, onRetry }: ErrorBannerProps) {
  const { colors, radius, spacing } = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        backgroundColor: `${colors.danger}14`,
        borderRadius: radius.md,
        padding: spacing.sm,
      }}
    >
      <Ionicons name="alert-circle-outline" size={20} color={colors.danger} />
      <Text variant="bodySmall" color="danger" style={{ flex: 1 }}>
        {message}
      </Text>
      {onRetry ? <Button label="Reintentar" variant="ghost" size="sm" onPress={onRetry} /> : null}
    </View>
  );
}

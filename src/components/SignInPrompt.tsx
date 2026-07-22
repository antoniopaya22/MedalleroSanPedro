import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { Button, Card, Text } from '@/components/ui';
import { useTheme } from '@/theme';

/**
 * Punto de entrada al login con Google para el modo público (R3). Cualquier
 * pantalla de navegación anónima puede mostrar esta misma tarjeta en lugar de
 * duplicar el copy y la navegación a `/sign-in`.
 */
export function SignInPrompt() {
  const { spacing } = useTheme();
  const router = useRouter();

  return (
    <Card>
      <View style={{ gap: spacing.sm }}>
        <Text variant="title">Accede con tu cuenta</Text>
        <Text variant="body" color="textSecondary">
          Inicia sesión con Google para registrar resultados y medallas.
        </Text>
        <Button label="Iniciar sesión con Google" onPress={() => router.push('/sign-in')} />
      </View>
    </Card>
  );
}

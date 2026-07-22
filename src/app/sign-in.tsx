import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, Screen, Text } from '@/components/ui';
import { BrandIntro } from '@/components/BrandIntro';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/theme';

/**
 * Único punto de login de la app (R1.1/R1.3): un solo botón "Continuar con
 * Google", sin email/contraseña ni otros proveedores. Al completarse con
 * éxito, `AuthGate` (en `_layout.tsx`) decide el destino (onboarding o app).
 */
export default function SignInScreen() {
  const { colors, spacing } = useTheme();
  const { signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePress = async () => {
    setError(null);
    setLoading(true);
    try {
      // Cancelación/cierre del navegador (R1.4): signInWithGoogle devuelve
      // `null` sin lanzar, así que no hay nada que mostrar en ese caso.
      await signInWithGoogle();
    } catch {
      setError('No se ha podido iniciar sesión con Google. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'center', gap: spacing.lg }}>
        <BrandIntro
          title="Iniciar sesión"
          subtitle="Accede con tu cuenta de Google para poder registrar resultados y medallas."
          size={56}
        />

        <Button
          label="Continuar con Google"
          onPress={handlePress}
          loading={loading}
          fullWidth
          leftIcon={<Ionicons name="logo-google" size={18} color={colors.onPrimary} />}
        />

        {error ? (
          <Text variant="bodySmall" color="danger" align="center">
            {error}
          </Text>
        ) : null}
      </View>
    </Screen>
  );
}

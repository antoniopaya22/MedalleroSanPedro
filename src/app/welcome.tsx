import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, Screen, Text } from '@/components/ui';
import { BrandIntro } from '@/components/BrandIntro';
import { GoogleSignInButton } from '@/components/GoogleSignInButton';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/theme';

/**
 * Gate de bienvenida (R1): pantalla previa al home para visitantes sin
 * sesión que aún no han elegido "invitado" en la sesión actual de la app.
 * El `AuthGate` de `_layout.tsx` decide cuándo mostrarla y cuándo sacar de
 * ella; esta pantalla solo ofrece las dos acciones y no navega en el caso de
 * éxito de Google (R4.2).
 */
export default function WelcomeScreen() {
  const { spacing } = useTheme();
  const { signInWithGoogle, chooseGuest } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGuest = () => {
    chooseGuest(); // R3.1 / R5.2
    router.replace('/'); // home en modo lectura pública, sin login
  };

  const handleGoogle = async () => {
    setError(null);
    setLoading(true);
    try {
      // R4.1; devuelve `null` si el usuario cancela (R4.3) → no hacemos nada,
      // permanecemos en esta pantalla. En éxito, el AuthGate redirige.
      await signInWithGoogle();
    } catch {
      setError('No se ha podido iniciar sesión con Google. Inténtalo de nuevo.'); // R4.4
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'center', gap: spacing.xl }}>
        <BrandIntro
          title="MedalleroSanPedro"
          subtitle="El medallero histórico de las actividades, deportes y juegos de mesa de San Pedro."
        />

        <View style={{ gap: spacing.md }}>
          <GoogleSignInButton onPress={handleGoogle} loading={loading} />
          <Button label="Continuar como invitado" variant="outline" fullWidth onPress={handleGuest} />
        </View>

        {error ? (
          <Text variant="bodySmall" color="danger" align="center">
            {error}
          </Text>
        ) : null}
      </View>
    </Screen>
  );
}

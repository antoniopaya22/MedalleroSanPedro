import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import {
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/manrope';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useMemo } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppLoading } from '@/components/AppLoading';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ThemeProvider, useTheme } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

// Constante a nivel de módulo (no un objeto nuevo en cada render de
// RootLayout): `useFonts` recarga en su efecto interno cada vez que este
// mapa cambia de identidad, lo que con un literal inline dispara un bucle
// de renders en cuanto `fontsLoaded` cambia de estado.
const FONT_MAP = {
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
};

/**
 * Fuerza el onboarding de reclamación de `Person` (R2.2): mientras haya
 * sesión y el `Profile` no tenga `personId`, redirige a `/claim-person` y no
 * deja navegar a ninguna otra ruta. Esta regla tiene precedencia sobre el
 * gate de bienvenida de f-013 (R1.4).
 *
 * Además (f-013), interpone la pantalla de bienvenida (`/welcome`) para
 * visitantes sin sesión que aún no han elegido "invitado" en la sesión
 * actual de la app (R1.1/R1.3): solo tras elegir Google o "invitado" se deja
 * navegar al resto de la app en modo lectura pública (f-012) o autenticado.
 *
 * Mientras no haya terminado de cargar fuentes o sesión (`fontsReady` /
 * `loading`), muestra `AppLoading` en vez de dejar un frame en blanco entre
 * el splash nativo y el primer contenido real.
 */
export function AuthGate({ children, fontsReady }: { children: React.ReactNode; fontsReady: boolean }) {
  const { loading, isAuthenticated, hasClaimedPerson, guestChosen } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  // `useSegments` devuelve un array nuevo en cada render: se deriva una
  // clave primitiva (comparada por valor, no por referencia) para que el
  // efecto no se dispare en renders donde la ruta no ha cambiado realmente.
  const segmentsKey = segments.join('/');

  useEffect(() => {
    if (loading || !fontsReady) {
      return;
    }

    const onClaimPerson = segmentsKey.split('/')[0] === 'claim-person';
    const onWelcome = segmentsKey.split('/')[0] === 'welcome';
    const onSignIn = segmentsKey.split('/')[0] === 'sign-in';

    // 1) Sesión sin Person reclamada → onboarding (f-011, precedencia, R1.4)
    if (isAuthenticated && !hasClaimedPerson && !onClaimPerson) {
      router.replace('/claim-person');
      return;
    }

    if (onClaimPerson && (!isAuthenticated || hasClaimedPerson)) {
      router.replace('/');
      return;
    }

    // 2) Sin sesión y sin elección de invitado → gate de bienvenida (f-013,
    //    R1.1/R1.3). Se exceptúa /sign-in para no interrumpir un login en
    //    curso iniciado desde el modo invitado (SignInPrompt).
    if (!isAuthenticated && !guestChosen && !onWelcome && !onSignIn) {
      router.replace('/welcome');
      return;
    }

    // 3) En /welcome pero ya hay sesión o ya se eligió invitado → salir al
    //    home (R5.1/R5.2).
    if (onWelcome && (isAuthenticated || guestChosen)) {
      router.replace('/');
    }
  }, [loading, fontsReady, isAuthenticated, hasClaimedPerson, guestChosen, segmentsKey, router]);

  if (!fontsReady || loading) {
    return <AppLoading />;
  }

  return <>{children}</>;
}

function ThemedStack({ fontsReady }: { fontsReady: boolean }) {
  const { colors, scheme } = useTheme();

  // Objeto estable (no uno nuevo en cada render): un `screenOptions` con
  // identidad cambiante hace que `NativeStackNavigator` reconfigure las
  // pantallas en bucle en web (bug de react-native-screens en RN Web).
  const screenOptions = useMemo(
    () => ({
      headerTitleAlign: 'center' as const,
      contentStyle: { backgroundColor: colors.background },
    }),
    [colors.background]
  );

  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <AuthGate fontsReady={fontsReady}>
        <Stack screenOptions={screenOptions}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="welcome" options={{ headerShown: false }} />
          <Stack.Screen name="sign-in" options={{ title: 'Iniciar sesión', presentation: 'modal' }} />
          <Stack.Screen name="claim-person" options={{ title: 'Reclama tu persona', headerBackVisible: false }} />
          <Stack.Screen name="activities/index" options={{ title: 'Actividades' }} />
          <Stack.Screen name="activities/new" options={{ title: 'Nueva actividad', presentation: 'modal' }} />
          <Stack.Screen name="activities/[id]" options={{ title: 'Editar actividad' }} />
          <Stack.Screen name="results/new" options={{ title: 'Registrar prueba', presentation: 'modal' }} />
        </Stack>
      </AuthGate>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts(FONT_MAP);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded]);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <ThemedStack fontsReady={fontsLoaded} />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

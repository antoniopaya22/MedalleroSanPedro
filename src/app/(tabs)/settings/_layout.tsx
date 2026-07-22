import { Stack } from 'expo-router';

import { useTheme } from '@/theme';

/**
 * Stack anidado de la pestaña Ajustes (f-015, R1.3): pantalla `index` única
 * hoy (cuenta/sesión + tema), sin `headerRight` (el botón de cuenta se
 * retira — ver design.md §7). Mismo patrón que las otras pestañas.
 */
export default function SettingsTabLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerTitleAlign: 'center',
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Ajustes' }} />
    </Stack>
  );
}

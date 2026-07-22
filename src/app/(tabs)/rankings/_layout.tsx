import { Stack } from 'expo-router';

import { useTheme } from '@/theme';

/**
 * Stack anidado de la pestaña Clasificaciones (f-014, R3/R5.1): `index` es el
 * hub que agrupa los tres rankings ya existentes.
 */
export default function RankingsTabLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerTitleAlign: 'center',
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Clasificaciones', headerShown: false }} />
      <Stack.Screen name="historic" options={{ title: 'Clasificación histórica', headerShown: false }} />
      <Stack.Screen name="editions/index" options={{ title: 'Clasificación por edición', headerShown: false }} />
      <Stack.Screen name="editions/[id]" options={{ title: 'Clasificación', headerShown: false }} />
      <Stack.Screen name="activities/index" options={{ title: 'Clasificación por actividad', headerShown: false }} />
      <Stack.Screen name="activities/[id]" options={{ title: 'Clasificación', headerShown: false }} />
    </Stack>
  );
}

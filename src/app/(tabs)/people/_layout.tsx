import { Stack } from 'expo-router';

import { useTheme } from '@/theme';

/**
 * Stack anidado de la pestaña Participantes (f-014, R5.1).
 */
export default function PeopleTabLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerTitleAlign: 'center',
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Personas', headerShown: false }} />
      <Stack.Screen name="new" options={{ title: 'Nueva persona', presentation: 'modal' }} />
      <Stack.Screen name="[id]/index" options={{ title: 'Participante', headerShown: false }} />
      <Stack.Screen name="[id]/edit" options={{ title: 'Editar persona' }} />
    </Stack>
  );
}

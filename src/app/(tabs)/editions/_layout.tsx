import { Stack } from 'expo-router';

import { useTheme } from '@/theme';

/**
 * Stack anidado de la pestaña Ediciones (f-014, R5.1): el listado y sus
 * detalles/edición navegan dentro de esta pestaña, conservando la barra de
 * pestañas visible. Títulos y modales igual que en el `Stack` raíz anterior.
 */
export default function EditionsTabLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerTitleAlign: 'center',
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Ediciones', headerShown: false }} />
      <Stack.Screen name="new" options={{ title: 'Nueva edición', presentation: 'modal' }} />
      <Stack.Screen name="[id]/index" options={{ title: 'Edición', headerShown: false }} />
      <Stack.Screen name="[id]/edit" options={{ title: 'Editar edición' }} />
    </Stack>
  );
}

import { Tabs } from 'expo-router';

import { AppTabBar } from '@/components/navigation/AppTabBar';

/**
 * Navegador de pestañas inferior (f-014, R1). El header lo aporta el `Stack`
 * anidado de cada pestaña (ver `(tabs)/editions|people|rankings/_layout.tsx`),
 * así que aquí se oculta para no duplicar cabeceras.
 */
export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <AppTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="editions" options={{ title: 'Ediciones' }} />
      <Tabs.Screen name="rankings" options={{ title: 'Clasificaciones' }} />
      <Tabs.Screen name="people" options={{ title: 'Participantes' }} />
      <Tabs.Screen name="settings" options={{ title: 'Ajustes' }} />
    </Tabs>
  );
}

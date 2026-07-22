import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/theme';

type TabRoute = BottomTabBarProps['state']['routes'][number];

interface TabConfig {
  label: string;
  iconFocused: keyof typeof Ionicons.glyphMap;
  iconUnfocused: keyof typeof Ionicons.glyphMap;
}

// Las claves coinciden con los `name` de `Tabs.Screen` en `(tabs)/_layout.tsx`
// (R1.1). El orden de `state.routes` sigue ese mismo orden declarado
// (editions, rankings, people, settings), que es también el orden visual
// deseado a ambos lados del FAB central (R2.2).
const TAB_CONFIG: Record<string, TabConfig> = {
  editions: { label: 'Ediciones', iconFocused: 'calendar', iconUnfocused: 'calendar-outline' },
  rankings: { label: 'Clasificaciones', iconFocused: 'podium', iconUnfocused: 'podium-outline' },
  people: { label: 'Participantes', iconFocused: 'people', iconUnfocused: 'people-outline' },
  settings: { label: 'Ajustes', iconFocused: 'settings', iconUnfocused: 'settings-outline' },
};

/**
 * Barra de pestañas inferior personalizada con un FAB central elevado de
 * acceso rápido a "Registrar resultado" (f-014, R1/R2/R4). Se pasa como prop
 * `tabBar` de `<Tabs>` y recibe las `BottomTabBarProps` estándar de React
 * Navigation (`state`, `descriptors`, `navigation`).
 *
 * El reparto de pestañas a cada lado del FAB (f-015, R2.2) se calcula por
 * punto medio (`Math.ceil(len/2)`) en vez de índices fijos, para soportar
 * cualquier número de pestañas sin descolocar el índice real de cada ruta.
 */
export function AppTabBar({ state, navigation }: BottomTabBarProps) {
  const { colors, spacing, radius, shadows } = useTheme();
  const insets = useSafeAreaInsets();
  const { canWrite } = useAuth();
  const router = useRouter();

  const onPressFab = () => {
    if (canWrite) {
      router.push('/results/new'); // R4.1
    } else {
      router.push('/sign-in'); // R4.2 — no /welcome: ver design.md §4.
    }
  };

  const routes = state.routes;
  const mid = Math.ceil(routes.length / 2);
  const leftRoutes = routes.slice(0, mid);
  const rightRoutes = routes.slice(mid);

  const renderTab = (route: TabRoute, index: number) => {
    const focused = state.index === index;

    return (
      <TabItem
        key={route.key}
        label={TAB_CONFIG[route.name]?.label ?? route.name}
        icon={focused ? TAB_CONFIG[route.name]?.iconFocused ?? 'ellipse' : TAB_CONFIG[route.name]?.iconUnfocused ?? 'ellipse-outline'}
        focused={focused}
        activeColor={colors.primary}
        inactiveColor={colors.textTertiary}
        onPress={() => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !(event as { defaultPrevented?: boolean }).defaultPrevented) {
            navigation.navigate(route.name);
          }
        }}
      />
    );
  };

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingTop: spacing.xs,
          paddingBottom: insets.bottom + spacing.xs,
        },
        shadows.sm,
      ]}
    >
      {leftRoutes.map((route, index) => renderTab(route, index))}

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Pressable
          onPress={onPressFab}
          accessibilityRole="button"
          accessibilityLabel="Registrar resultado"
          style={({ pressed }) => [
            {
              width: 56,
              height: 56,
              borderRadius: radius.pill,
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              transform: [{ translateY: -18 }],
              opacity: pressed ? 0.85 : 1,
            },
            shadows.md,
          ]}
        >
          <LinearGradient
            colors={[colors.gradientFrom, colors.gradientTo]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          />
          <Ionicons name="add" size={30} color="#FFFFFF" />
        </Pressable>
      </View>

      {rightRoutes.map((route, index) => renderTab(route, mid + index))}
    </View>
  );
}

interface TabItemProps {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  focused: boolean;
  activeColor: string;
  inactiveColor: string;
  onPress: () => void;
}

function TabItem({ label, icon, focused, activeColor, inactiveColor, onPress }: TabItemProps) {
  const color = focused ? activeColor : inactiveColor;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 4 }}
    >
      <Ionicons name={icon} size={26} color={color} />
    </Pressable>
  );
}

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';
import { Text } from './Text';

export interface HeroHeaderProps {
  eyebrow: string;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  /**
   * `full` (por defecto): para las raíces de pestaña, con el bloque de
   * título grande. `compact`: franja baja para pantallas de segundo nivel
   * (detalle, sub-listados), con hueco para el botón de volver que el header
   * nativo ya no aporta al desactivarlo.
   */
  variant?: 'full' | 'compact';
  showBack?: boolean;
  onBack?: () => void;
}

/**
 * Cabecera de marca (gradiente trigo→terracota) en sustitución del header
 * nativo plano. Se apoya en el padding horizontal del `Screen` contenedor y
 * lo cancela con margen negativo para quedar a sangre, sin tener que tocar
 * `Screen`.
 *
 * Importante: la pantalla que use este componente debe pasar `edges` a
 * `Screen` SIN `'top'` (p. ej. `['left', 'right']`) — si no, el `SafeAreaView`
 * reserva el hueco del notch/status bar con `colors.background` antes de que
 * este componente llegue a pintar nada, y el gradiente no llega hasta arriba
 * del todo. Aquí se añade manualmente el inset superior como padding, para
 * que el propio gradiente ocupe ese espacio en vez de dejarlo en blanco.
 */
export function HeroHeader({ eyebrow, title, subtitle, right, variant = 'full', showBack = false, onBack }: HeroHeaderProps) {
  const { colors, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const compact = variant === 'compact';

  return (
    <View style={{ marginHorizontal: -spacing.lg, marginBottom: spacing.sm }}>
      <LinearGradient
        colors={[colors.gradientFrom, colors.gradientTo]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          paddingHorizontal: spacing.lg,
          paddingTop: insets.top + spacing.sm,
          paddingBottom: compact ? spacing.md : spacing.xl,
          borderBottomLeftRadius: compact ? radius.lg : radius.xl,
          borderBottomRightRadius: compact ? radius.lg : radius.xl,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: compact ? 'center' : 'flex-end', gap: spacing.sm }}>
          {showBack ? (
            <Pressable
              onPress={onBack ?? (() => router.back())}
              accessibilityRole="button"
              accessibilityLabel="Volver"
              hitSlop={8}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
            >
              <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
            </Pressable>
          ) : null}

          <View style={{ flex: 1, gap: compact ? 0 : 2 }}>
            <Text variant={compact ? 'caption' : 'overline'} style={{ color: 'rgba(255,255,255,0.85)' }}>
              {eyebrow}
            </Text>
            <Text variant={compact ? 'h3' : 'display'} style={{ color: '#FFFFFF' }}>
              {title}
            </Text>
            {subtitle ? (
              <Text variant={compact ? 'caption' : 'body'} style={{ color: 'rgba(255,255,255,0.9)' }}>
                {subtitle}
              </Text>
            ) : null}
          </View>
          {right}
        </View>
      </LinearGradient>
    </View>
  );
}

import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';

import { useTheme } from '@/theme';
import { Badge } from './Badge';
import { Text } from './Text';

export interface NavCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  /** Si se pasa, la tarjeta se muestra deshabilitada con este badge en vez de chevron (p. ej. "Pronto"). */
  comingSoonLabel?: string;
  /**
   * `elevated` (por defecto): el acceso principal de un hub, con sombra e
   * icono a todo color. `flat`: para accesos secundarios de gestión que no
   * deben competir visualmente con el contenido principal del hub.
   */
  variant?: 'elevated' | 'flat';
}

/** Tarjeta grande de navegación para hubs como la home: icono + título + acción. */
export function NavCard({ icon, title, subtitle, onPress, comingSoonLabel, variant = 'elevated' }: NavCardProps) {
  const { colors, radius, spacing, shadows } = useTheme();
  const disabled = !onPress;
  const flat = variant === 'flat';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          backgroundColor: flat ? 'transparent' : colors.surface,
          borderRadius: radius.lg,
          padding: flat ? spacing.sm : spacing.md,
          borderWidth: flat ? 1 : 0,
          borderColor: colors.border,
        },
        disabled ? { opacity: 0.6 } : [!flat && shadows.sm, { opacity: pressed ? 0.85 : 1 }],
      ]}
    >
      <View
        style={{
          width: flat ? 36 : 48,
          height: flat ? 36 : 48,
          borderRadius: radius.md,
          backgroundColor: colors.surfaceAlt,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name={icon} size={flat ? 18 : 24} color={flat ? colors.textSecondary : colors.primary} />
      </View>

      <View style={{ flex: 1, gap: 2 }}>
        <Text variant={flat ? 'body' : 'title'} color={flat ? 'textSecondary' : 'textPrimary'}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="bodySmall" color="textSecondary">
            {subtitle}
          </Text>
        ) : null}
      </View>

      {comingSoonLabel ? (
        <Badge label={comingSoonLabel} variant="neutral" />
      ) : (
        <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
      )}
    </Pressable>
  );
}

import { Pressable, View } from 'react-native';

import { useTheme } from '@/theme';
import { Text } from './Text';

export interface SegmentedOption<T extends string> {
  key: T;
  label: string;
}

export interface SegmentedProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  fullWidth?: boolean;
  /**
   * `default`: navegación de nivel de pantalla (pestañas). `compact`: uso
   * secundario dentro de una pestaña ya elegida (p. ej. un criterio de
   * orden) — más pequeño y sin sombra, para no leerse como el mismo control
   * repetido dos veces en la misma pantalla.
   */
  variant?: 'default' | 'compact';
}

/**
 * Control de segmentos (píldora con fondo `surfaceAlt`, opción activa
 * elevada sobre `surface`). Lenguaje visual reservado para "cambiar de vista"
 * (pestañas, criterio de orden) — distinto del de filtro (FilterButton) y del
 * de acción (Button), para que un vistazo baste para distinguirlos.
 */
export function Segmented<T extends string>({ options, value, onChange, fullWidth = false, variant = 'default' }: SegmentedProps<T>) {
  const { colors, radius, spacing, shadows } = useTheme();
  const compact = variant === 'compact';

  return (
    <View
      style={{
        flexDirection: 'row',
        alignSelf: fullWidth ? 'stretch' : 'flex-start',
        backgroundColor: colors.surfaceAlt,
        borderRadius: radius.pill,
        padding: compact ? 2 : 3,
      }}
    >
      {options.map((option) => {
        const selected = value === option.key;
        return (
          <Pressable
            key={option.key}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.key)}
            style={({ pressed }) => [
              {
                flex: fullWidth ? 1 : undefined,
                alignItems: 'center',
                paddingHorizontal: compact ? spacing.xs : spacing.sm,
                paddingVertical: compact ? 4 : spacing.xs,
                borderRadius: radius.pill,
                backgroundColor: selected ? colors.surface : 'transparent',
                opacity: pressed ? 0.7 : 1,
              },
              selected && !compact && shadows.sm,
            ]}
          >
            <Text variant={compact ? 'caption' : 'bodySmall'} style={{ color: selected ? colors.textPrimary : colors.textSecondary }}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

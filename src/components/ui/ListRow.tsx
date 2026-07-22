import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';

import { useTheme } from '@/theme';
import type { ThemeColors } from '@/theme/colors';
import { Text } from './Text';

export interface ListRowProps {
  icon?: keyof typeof Ionicons.glyphMap;
  /** Nodo custom (p. ej. `Avatar`) que sustituye al icono cuando se necesita más que un glifo. */
  left?: React.ReactNode;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  showChevron?: boolean;
  /** Fila elegida en un flujo de selección: fondo tintado + check en vez de chevron. */
  selected?: boolean;
  /** Color del tinte/check cuando `selected` (por defecto `primary`; útil para oro/plata/bronce). */
  selectedColor?: keyof ThemeColors;
}

export function ListRow({
  icon,
  left,
  title,
  subtitle,
  right,
  onPress,
  showChevron = !!onPress,
  selected = false,
  selectedColor = 'primary',
}: ListRowProps) {
  const { colors, spacing, radius } = useTheme();
  const tint = colors[selectedColor];

  const content = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        paddingHorizontal: selected ? spacing.sm : 0,
        gap: spacing.sm,
        backgroundColor: selected ? `${tint}1F` : 'transparent',
        borderRadius: selected ? radius.md : 0,
      }}
    >
      {left ? (
        left
      ) : icon ? (
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: radius.md,
            backgroundColor: colors.surfaceAlt,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name={icon} size={18} color={colors.textPrimary} />
        </View>
      ) : null}

      <View style={{ flex: 1 }}>
        <Text variant="title">{title}</Text>
        {subtitle ? (
          <Text variant="bodySmall" color="textSecondary">
            {subtitle}
          </Text>
        ) : null}
      </View>

      {right}

      {selected ? (
        <Ionicons name="checkmark-circle" size={20} color={tint} />
      ) : showChevron ? (
        <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
        {content}
      </Pressable>
    );
  }

  return content;
}

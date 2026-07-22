import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, View } from 'react-native';

import { useTheme } from '@/theme';
import { Button } from './Button';
import { Text } from './Text';

export interface FilterButtonProps {
  title: string;
  /** Número de filtros no-default aplicados; se muestra como contador sobre el icono si no hay `valueLabel`. */
  activeCount?: number;
  /** Texto del valor activo (p. ej. "Activos") para enseñarlo junto al icono en vez de solo un contador. */
  valueLabel?: string;
  children: React.ReactNode;
}

/**
 * Botón de icono (o chip con el valor activo) que abre una hoja inferior con
 * las opciones de filtro agrupadas, en vez de dejarlas como fila(s) de
 * botones siempre visibles. Lenguaje visual reservado para "esto filtra los
 * datos" — distinto del de Segmented ("esto cambia de vista") y del de
 * Button ("esto ejecuta algo").
 */
export function FilterButton({ title, activeCount = 0, valueLabel, children }: FilterButtonProps) {
  const [open, setOpen] = useState(false);
  const { colors, radius, spacing, shadows, touchTarget } = useTheme();
  const hasActive = activeCount > 0;
  const showValueChip = hasActive && !!valueLabel;

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${title}${hasActive ? `, ${valueLabel ?? `${activeCount} filtros activos`}` : ''}`}
        style={({ pressed }) => [
          {
            height: touchTarget.min,
            minWidth: showValueChip ? undefined : touchTarget.min,
            paddingHorizontal: showValueChip ? spacing.sm : 0,
            borderRadius: radius.pill,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            backgroundColor: hasActive ? colors.primary : colors.surfaceAlt,
            borderWidth: hasActive ? 0 : 1,
            borderColor: colors.borderStrong,
            opacity: pressed ? 0.8 : 1,
          },
        ]}
      >
        <Ionicons name="options-outline" size={20} color={hasActive ? colors.onPrimary : colors.textPrimary} />
        {showValueChip ? (
          <Text variant="bodySmall" style={{ color: colors.onPrimary }}>
            {valueLabel}
          </Text>
        ) : hasActive ? (
          <View
            style={{
              position: 'absolute',
              top: -4,
              right: -4,
              minWidth: 18,
              height: 18,
              borderRadius: radius.pill,
              paddingHorizontal: 3,
              backgroundColor: colors.accent,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text variant="caption" style={{ color: colors.onAccent, fontSize: 10, lineHeight: 12 }}>
              {activeCount}
            </Text>
          </View>
        ) : null}
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable
          accessibilityLabel="Cerrar filtros"
          style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' }}
          onPress={() => setOpen(false)}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={[
              {
                backgroundColor: colors.surface,
                borderTopLeftRadius: radius.xl,
                borderTopRightRadius: radius.xl,
                padding: spacing.lg,
                gap: spacing.lg,
              },
              shadows.lg,
            ]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text variant="h3">{title}</Text>
              <Pressable onPress={() => setOpen(false)} accessibilityRole="button" accessibilityLabel="Cerrar">
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </Pressable>
            </View>

            {children}

            <Button label="Hecho" onPress={() => setOpen(false)} fullWidth />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

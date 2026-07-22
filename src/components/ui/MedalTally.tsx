import { View } from 'react-native';

import { useTheme } from '@/theme';
import type { ThemeColors } from '@/theme/colors';
import { Text } from './Text';

export interface MedalTallyProps {
  gold: number;
  silver: number;
  bronze: number;
  /**
   * `md`/`sm`: chip con la palabra completa (Oro/Plata/Bronce) — para sitios
   * con aire, como el resumen de una persona. `xs`: solo icono + número, sin
   * la palabra (que sigue viva en el `accessibilityLabel`) — para filas de
   * ranking estrechas, con el nombre ya compitiendo por espacio a la
   * izquierda.
   */
  size?: 'xs' | 'sm' | 'md';
}

const MEDALS: { key: 'gold' | 'silver' | 'bronze'; label: string; color: keyof ThemeColors }[] = [
  { key: 'gold', label: 'Oro', color: 'medalGold' },
  { key: 'silver', label: 'Plata', color: 'medalSilver' },
  { key: 'bronze', label: 'Bronce', color: 'medalBronze' },
];

/** Desglose de medallas como chips de color, reutilizando los tokens medalGold/Silver/Bronze del tema. */
export function MedalTally({ gold, silver, bronze, size = 'md' }: MedalTallyProps) {
  const { colors, spacing, radius } = useTheme();
  const counts = { gold, silver, bronze };
  const compact = size === 'sm';
  const minimal = size === 'xs';

  return (
    <View style={{ flexDirection: 'row', gap: minimal ? 6 : spacing.xs }} accessibilityLabel={`Oro ${gold} · Plata ${silver} · Bronce ${bronze}`}>
      {MEDALS.map(({ key, label, color }) => {
        const tint = colors[color];
        const value = counts[key];
        return (
          <View
            key={key}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: minimal ? 3 : 4,
              paddingVertical: minimal ? 1 : compact ? 2 : 3,
              paddingHorizontal: minimal ? 5 : compact ? 6 : 8,
              borderRadius: radius.pill,
              backgroundColor: `${tint}1F`,
              opacity: value > 0 ? 1 : 0.5,
            }}
          >
            <View style={{ width: minimal ? 6 : 8, height: minimal ? 6 : 8, borderRadius: radius.pill, backgroundColor: tint }} />
            <Text variant={minimal || compact ? 'caption' : 'bodySmall'} style={{ color: tint }}>
              {minimal ? value : `${label} ${value}`}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

import { View } from 'react-native';

import { Card, Text } from '@/components/ui';
import type { PersonEditionBreakdownRow } from '@/services/rankings';
import { useTheme } from '@/theme';

export interface PersonEditionBarChartProps {
  rows: PersonEditionBreakdownRow[];
}

function formatAverage(value: number): string {
  return value.toFixed(2);
}

/**
 * Gráfico de puntos por edición de UNA persona (f-018, R1/R2): barra
 * horizontal proporcional al máximo de `score` entre las filas, sin librería
 * de charts ni SVG — `View`/flexbox es suficiente para una barra simple y es
 * más fácil de testear (se lee el `style` renderizado). El promedio de
 * puntos por participación de esa edición se muestra como texto bajo cada
 * barra en vez de una segunda pista, para no duplicar la lectura visual de
 * un único número.
 */
export function PersonEditionBarChart({ rows }: PersonEditionBarChartProps) {
  const { colors, radius, spacing } = useTheme();
  const maxScore = Math.max(...rows.map((row) => row.score), 0);

  return (
    <Card>
      <View style={{ gap: spacing.md }}>
        {rows.map((row, index) => {
          const pct = maxScore > 0 ? (row.score / maxScore) * 100 : 0;

          return (
            <View key={row.editionId} style={{ gap: spacing.xxs, marginTop: index > 0 ? spacing.xs : 0 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <Text variant="bodySmall">
                  {row.editionYear}
                  {row.editionLabel ? ` · ${row.editionLabel}` : ''}
                </Text>
                <Text variant="bodySmall">{row.score} pts</Text>
              </View>
              <View
                style={{
                  height: 8,
                  borderRadius: radius.pill,
                  backgroundColor: colors.surfaceAlt,
                  overflow: 'hidden',
                }}
              >
                <View
                  style={{
                    width: `${pct}%`,
                    height: '100%',
                    borderRadius: radius.pill,
                    backgroundColor: colors.gradientFrom,
                  }}
                />
              </View>
              <Text variant="caption" color="textSecondary">
                {formatAverage(row.scorePerParticipation)} puntos/participación
              </Text>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

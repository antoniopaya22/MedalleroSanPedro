import { View } from 'react-native';

import { Card, Divider, ListRow, Text } from '@/components/ui';
import type { PersonActivityBreakdownRow } from '@/services/rankings';
import { useTheme } from '@/theme';

export interface PersonActivityBreakdownListProps {
  rows: PersonActivityBreakdownRow[];
}

function formatAverage(value: number): string {
  return value.toFixed(2);
}

/**
 * Actividades de UNA persona ordenadas por su propio mejor promedio de
 * puntos por participación (f-018, R3) — el orden ya viene dado por
 * `buildPersonActivityBreakdown`, este componente solo renderiza. Mismo
 * lenguaje visual que las listas de ranking (`EditionRankingList`): posición
 * + valor grande + detalle pequeño.
 */
export function PersonActivityBreakdownList({ rows }: PersonActivityBreakdownListProps) {
  const { spacing } = useTheme();

  return (
    <Card>
      {rows.map((row, index) => (
        <View key={row.activityId}>
          {index > 0 ? <Divider /> : null}
          <ListRow
            title={`${index + 1}. ${row.activityName}`}
            right={
              <View style={{ alignItems: 'flex-end', gap: spacing.xxs }}>
                <Text variant="title">{formatAverage(row.scorePerParticipation)}</Text>
                <Text variant="caption" color="textSecondary">
                  {row.score} pts · {row.participations} part.
                </Text>
              </View>
            }
            showChevron={false}
          />
        </View>
      ))}
    </Card>
  );
}

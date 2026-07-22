import { View } from 'react-native';

import { Card, Divider, ListRow, MedalTally, Text } from '@/components/ui';
import type { RankingRow } from '@/services/rankings';
import { useTheme } from '@/theme';

export interface EditionRankingListProps {
  ranking: RankingRow[];
}

const TOP_MEDAL_COLORS = ['medalGold', 'medalSilver', 'medalBronze'] as const;

function formatAverage(value: number): string {
  return value.toFixed(2);
}

/**
 * Lista de clasificación de una edición (posición, desglose de medallas,
 * puntos, participaciones y promedio). Componente presentacional compartido
 * (f-016, design.md §3) por `rankings/editions/[id].tsx` (f-005) y
 * `editions/[id]/index.tsx` (vista de detalle de edición).
 */
export function EditionRankingList({ ranking }: EditionRankingListProps) {
  const { colors, radius, spacing } = useTheme();

  return (
    <Card>
      {ranking.map((row, index) => (
        <View key={row.personId}>
          {index > 0 ? <Divider /> : null}
          <ListRow
            title={`${index + 1}. ${row.personName}`}
            right={
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                {index < 3 ? (
                  <View
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: radius.pill,
                      backgroundColor: colors[TOP_MEDAL_COLORS[index]],
                    }}
                  />
                ) : null}
                <View style={{ alignItems: 'flex-end', gap: spacing.xxs }}>
                  <MedalTally gold={row.gold} silver={row.silver} bronze={row.bronze} size="xs" />
                  <Text variant="caption" color="textSecondary">
                    {row.score} pts · {row.participations} part. · {formatAverage(row.scorePerParticipation)}
                  </Text>
                </View>
              </View>
            }
            showChevron={false}
          />
        </View>
      ))}
    </Card>
  );
}

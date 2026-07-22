import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';

import { Card, Divider, EmptyState, FilterButton, HeroHeader, ListRow, MedalTally, Screen, Segmented, Text } from '@/components/ui';
import { listEditions } from '@/services/editions';
import { type HistoricRankingRow, type RankingSortMode, listHistoricRanking, sortHistoricRanking } from '@/services/rankings';
import { useTheme } from '@/theme';

function formatAverage(value: number): string {
  return value.toFixed(2);
}

type RangeMode = 'all' | 'last5' | 'last10';

const RANGE_OPTIONS: { key: RangeMode; label: string }[] = [
  { key: 'all', label: 'Todas' },
  { key: 'last5', label: 'Últimos 5 años' },
  { key: 'last10', label: 'Últimos 10 años' },
];

export default function HistoricRankingScreen() {
  const { spacing } = useTheme();

  const [ranking, setRanking] = useState<HistoricRankingRow[]>([]);
  const [sortMode, setSortMode] = useState<RankingSortMode>('medals');
  const [rangeMode, setRangeMode] = useState<RangeMode>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // El rango de años (f-021, R1) recalcula la agregación en el servicio (no
  // un recorte visual): a diferencia del toggle de orden, cambiar de chip
  // SÍ vuelve a consultar el backend. El "año más reciente" para calcular
  // el rango sale de las ediciones existentes (R1.2), no de la fecha real.
  const loadRanking = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) {
        setLoading(true);
      }
      setError(null);
      try {
        const editions = await listEditions();
        const maxYear = editions.length > 0 ? Math.max(...editions.map((edition) => edition.year)) : undefined;
        const span = rangeMode === 'last5' ? 5 : rangeMode === 'last10' ? 10 : undefined;
        const yearRange = span !== undefined && maxYear !== undefined ? { fromYear: maxYear - span + 1 } : undefined;

        setRanking(await listHistoricRanking(yearRange));
      } catch {
        setError('No se ha podido cargar la clasificación histórica.');
      } finally {
        if (!opts?.silent) {
          setLoading(false);
        }
        setRefreshing(false);
      }
    },
    [rangeMode]
  );

  useFocusEffect(
    useCallback(() => {
      loadRanking();
    }, [loadRanking])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadRanking({ silent: true });
  };

  // Reordena la misma lista en cliente (R3.1): nunca vuelve a consultar el
  // backend al alternar el criterio de orden.
  const sortedRanking = useMemo(() => sortHistoricRanking(ranking, sortMode), [ranking, sortMode]);

  if (loading) {
    return (
      <Screen edges={['left', 'right']}>
        <Text variant="body" color="textSecondary">
          Cargando...
        </Text>
      </Screen>
    );
  }

  const rangeActive = rangeMode !== 'all';

  return (
    <Screen scroll edges={['left', 'right']} onRefresh={handleRefresh} refreshing={refreshing}>
      <HeroHeader eyebrow="RANKINGS" title="Clasificación histórica" subtitle="Medallas agregadas de todas las ediciones." />

      <View style={{ gap: spacing.lg }}>
        {error ? (
          <Text variant="bodySmall" color="danger">
            {error}
          </Text>
        ) : null}

        {!error && sortedRanking.length > 0 ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }}>
            <Segmented
              options={[
                { key: 'medals' as const, label: 'Por medallas' },
                { key: 'average' as const, label: 'Por promedio' },
              ]}
              value={sortMode}
              onChange={setSortMode}
            />
            <FilterButton
              title="Rango de años"
              activeCount={rangeActive ? 1 : 0}
              valueLabel={rangeActive ? RANGE_OPTIONS.find((option) => option.key === rangeMode)?.label : undefined}
            >
              <Segmented options={RANGE_OPTIONS} value={rangeMode} onChange={setRangeMode} fullWidth />
            </FilterButton>
          </View>
        ) : null}

        {!error && sortedRanking.length === 0 ? (
          <EmptyState
            icon="podium-outline"
            title="Sin resultados"
            description="Cuando se registre una prueba en cualquier edición, aparecerá la clasificación histórica."
          />
        ) : (
          <Card>
            {sortedRanking.map((row, index) => (
              <View key={row.personId}>
                {index > 0 ? <Divider /> : null}
                <ListRow
                  title={`${index + 1}. ${row.personName}`}
                  right={
                    <View style={{ alignItems: 'flex-end', gap: spacing.xxs }}>
                      <MedalTally gold={row.gold} silver={row.silver} bronze={row.bronze} size="xs" />
                      <Text variant="caption" color="textSecondary">
                        {row.score} pts · {row.participations} part. · {formatAverage(row.scorePerParticipation)}
                      </Text>
                    </View>
                  }
                  showChevron={false}
                />
              </View>
            ))}
          </Card>
        )}
      </View>
    </Screen>
  );
}

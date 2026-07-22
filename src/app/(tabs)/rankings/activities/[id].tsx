import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { Button, Card, Divider, EmptyState, HeroHeader, ListRow, Screen, Text } from '@/components/ui';
import { listActivities } from '@/services/activities';
import { type ActivityHistoryEntry, listActivityHistory } from '@/services/activityResults';
import { type ActivityRankingRow, type RankingSortMode, listActivityRanking, sortRanking } from '@/services/rankings';
import { useTheme } from '@/theme';
import type { Activity, Medal } from '@/types/domain';

function formatAverage(value: number): string {
  return value.toFixed(2);
}

const MEDAL_LABEL: Record<Medal, string> = {
  gold: 'Oro',
  silver: 'Plata',
  bronze: 'Bronce',
};

const MEDAL_COLOR: Record<Medal, 'medalGold' | 'medalSilver' | 'medalBronze'> = {
  gold: 'medalGold',
  silver: 'medalSilver',
  bronze: 'medalBronze',
};

/**
 * Histórico de pruebas y clasificación agregada de una `Activity` concreta a
 * través de todas las ediciones en las que se jugó (R2/R3): vista de solo
 * lectura, sin ningún control de escritura, accesible sin sesión (R4.1/R4.2).
 */
export default function ActivityRankingDetailScreen() {
  const { spacing } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [activity, setActivity] = useState<Activity | null>(null);
  const [history, setHistory] = useState<ActivityHistoryEntry[]>([]);
  const [ranking, setRanking] = useState<ActivityRankingRow[]>([]);
  const [sortMode, setSortMode] = useState<RankingSortMode>('medals');
  const [selectedEditionId, setSelectedEditionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [activities, historyEntries, rankingRows] = await Promise.all([
        listActivities(),
        listActivityHistory(id),
        listActivityRanking(id),
      ]);
      setActivity(activities.find((candidate) => candidate.id === id) ?? null);
      setHistory(historyEntries);
      setRanking(rankingRows);
    } catch {
      setError('No se ha podido cargar la clasificación de la actividad.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Reordena en cliente (R3.6): nunca vuelve a consultar el backend al
  // alternar el criterio de orden.
  const sortedRanking = useMemo(() => sortRanking(ranking, sortMode), [ranking, sortMode]);

  // Chips de edición para el histórico de pruebas (f-021, R4): puramente en
  // cliente sobre el histórico ya cargado, sin refetch. No afecta a la
  // sección "Clasificación" (R4.3).
  const editionOptions = useMemo(() => {
    const seen = new Map<string, { editionId: string; editionYear: number; label: string }>();
    for (const entry of history) {
      if (!seen.has(entry.editionId)) {
        seen.set(entry.editionId, {
          editionId: entry.editionId,
          editionYear: entry.editionYear,
          label: `${entry.editionYear}${entry.editionLabel ? ` · ${entry.editionLabel}` : ''}`,
        });
      }
    }
    // Orden por año (más reciente primero), no por `editionId`: es un uuid,
    // no ordenable cronológicamente.
    return Array.from(seen.values()).sort((a, b) => b.editionYear - a.editionYear);
  }, [history]);

  const filteredHistory = useMemo(
    () => (selectedEditionId ? history.filter((entry) => entry.editionId === selectedEditionId) : history),
    [history, selectedEditionId]
  );

  if (loading) {
    return (
      <Screen edges={['left', 'right']}>
        <HeroHeader variant="compact" showBack eyebrow="RANKINGS" title="Cargando…" />
      </Screen>
    );
  }

  return (
    <Screen scroll edges={['left', 'right']}>
      <HeroHeader
        variant="compact"
        showBack
        eyebrow="RANKINGS"
        title={activity ? activity.name : 'Actividad'}
        subtitle="Clasificación e histórico de pruebas de esta actividad."
      />
      <View style={{ gap: spacing.lg }}>
        {error ? (
          <Text variant="bodySmall" color="danger">
            {error}
          </Text>
        ) : null}

        <View style={{ gap: spacing.sm }}>
          <Text variant="title">Clasificación</Text>

          {!error && sortedRanking.length > 0 ? (
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Button
                  label="Por medallas"
                  variant={sortMode === 'medals' ? 'primary' : 'outline'}
                  fullWidth
                  onPress={() => setSortMode('medals')}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  label="Por promedio"
                  variant={sortMode === 'average' ? 'primary' : 'outline'}
                  fullWidth
                  onPress={() => setSortMode('average')}
                />
              </View>
            </View>
          ) : null}

          {!error && sortedRanking.length === 0 ? (
            <EmptyState
              icon="podium-outline"
              title="Sin resultados"
              description="Cuando se registre una prueba de esta actividad, aparecerá su clasificación."
            />
          ) : (
            <Card>
              {sortedRanking.map((row, index) => (
                <View key={row.personId}>
                  {index > 0 ? <Divider /> : null}
                  <ListRow
                    title={`${index + 1}. ${row.personName}`}
                    subtitle={`Oro ${row.gold} · Plata ${row.silver} · Bronce ${row.bronze}`}
                    right={
                      <View style={{ alignItems: 'flex-end', gap: spacing.xxs }}>
                        <Text variant="title">{row.score} pts</Text>
                        <Text variant="caption" color="textSecondary">
                          {row.total} medallas · {row.participations} part. · {formatAverage(row.scorePerParticipation)}
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

        <View style={{ gap: spacing.sm }}>
          <Text variant="title">Histórico de pruebas</Text>

          {!error && history.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: spacing.xs }}>
                <Button
                  label="Todas"
                  size="sm"
                  variant={selectedEditionId === null ? 'primary' : 'outline'}
                  onPress={() => setSelectedEditionId(null)}
                  testID="edition-chip-all"
                />
                {editionOptions.map((option) => (
                  <Button
                    key={option.editionId}
                    label={option.label}
                    size="sm"
                    variant={selectedEditionId === option.editionId ? 'primary' : 'outline'}
                    onPress={() => setSelectedEditionId(option.editionId)}
                    testID={`edition-chip-${option.editionId}`}
                  />
                ))}
              </View>
            </ScrollView>
          ) : null}

          {!error && history.length === 0 ? (
            <EmptyState
              icon="time-outline"
              title="Sin pruebas registradas"
              description="Cuando se registre una prueba de esta actividad, aparecerá aquí."
            />
          ) : (
            <Card>
              {filteredHistory.map((entry, index) => (
                <View key={entry.resultId}>
                  {index > 0 ? <Divider /> : null}
                  <View style={{ gap: spacing.xxs, paddingVertical: spacing.sm }}>
                    <Text variant="title">
                      {entry.editionYear}
                      {entry.editionLabel ? ` · ${entry.editionLabel}` : ''}
                    </Text>
                    <Text variant="bodySmall" color="textSecondary">
                      {entry.participantCount} participantes
                    </Text>
                    <View style={{ gap: spacing.xxs }}>
                      {entry.medals.map((medal) => (
                        <Text key={medal.medal} variant="bodySmall">
                          <Text variant="bodySmall" color={MEDAL_COLOR[medal.medal]}>
                            {MEDAL_LABEL[medal.medal]}
                          </Text>
                          {': '}
                          {medal.personNames.join(', ')}
                        </Text>
                      ))}
                    </View>
                  </View>
                </View>
              ))}
            </Card>
          )}
        </View>
      </View>
    </Screen>
  );
}

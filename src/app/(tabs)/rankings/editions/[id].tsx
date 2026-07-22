import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';

import { Button, EmptyState, ErrorBanner, HeroHeader, LoadingState, Screen } from '@/components/ui';
import { EditionRankingList } from '@/components/rankings/EditionRankingList';
import { listEditions } from '@/services/editions';
import { type EditionRankingRow, type RankingSortMode, listEditionRanking, sortRanking } from '@/services/rankings';
import { useTheme } from '@/theme';
import type { Edition } from '@/types/domain';

export default function EditionRankingDetailScreen() {
  const { spacing } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [edition, setEdition] = useState<Edition | null>(null);
  const [ranking, setRanking] = useState<EditionRankingRow[]>([]);
  const [sortMode, setSortMode] = useState<RankingSortMode>('medals');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRanking = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [editions, rows] = await Promise.all([listEditions(), listEditionRanking(id)]);
      setEdition(editions.find((candidate) => candidate.id === id) ?? null);
      setRanking(rows);
    } catch {
      setError('No se ha podido cargar la clasificación.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      loadRanking();
    }, [loadRanking])
  );

  // Reordena en cliente (f-021, R3.2): mismo patrón que rankings/historic.tsx
  // y rankings/activities/[id].tsx, sin volver a consultar el backend.
  const sortedRanking = useMemo(() => sortRanking(ranking, sortMode), [ranking, sortMode]);

  if (loading) {
    return (
      <Screen edges={['left', 'right']}>
        <HeroHeader variant="compact" showBack eyebrow="CLASIFICACIÓN" title="Cargando…" />
        <LoadingState />
      </Screen>
    );
  }

  return (
    <Screen scroll edges={['left', 'right']}>
      <HeroHeader
        variant="compact"
        showBack
        eyebrow="CLASIFICACIÓN"
        title={edition ? String(edition.year) : ''}
        subtitle={edition?.label ?? undefined}
      />
      <View style={{ gap: spacing.lg }}>
        {!error && ranking.length > 0 ? (
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

        {error ? (
          <ErrorBanner message={error} onRetry={loadRanking} />
        ) : ranking.length === 0 ? (
          <EmptyState
            icon="podium-outline"
            title="Sin resultados"
            description="Cuando se registre una prueba en esta edición, aparecerá la clasificación."
          />
        ) : (
          <EditionRankingList ranking={sortedRanking} />
        )}
      </View>
    </Screen>
  );
}


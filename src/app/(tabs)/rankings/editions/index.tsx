import type { Href } from 'expo-router';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { Card, Divider, EmptyState, ErrorBanner, HeroHeader, ListRow, LoadingState, Screen } from '@/components/ui';
import { listEditions } from '@/services/editions';
import { useTheme } from '@/theme';
import type { Edition } from '@/types/domain';

export default function EditionRankingIndexScreen() {
  const { spacing } = useTheme();
  const router = useRouter();

  const [editions, setEditions] = useState<Edition[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadEditions = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) {
      setLoading(true);
    }
    setError(null);
    try {
      setEditions(await listEditions());
    } catch {
      setError('No se han podido cargar las ediciones.');
    } finally {
      if (!opts?.silent) {
        setLoading(false);
      }
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadEditions();
    }, [loadEditions])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadEditions({ silent: true });
  };

  return (
    <Screen scroll edges={['left', 'right']} onRefresh={handleRefresh} refreshing={refreshing}>
      <HeroHeader
        variant="compact"
        showBack
        eyebrow="RANKINGS"
        title="Clasificación por edición"
        subtitle="Elige una edición para ver medallas, participaciones y promedio."
      />
      <View style={{ gap: spacing.lg }}>
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorBanner message={error} onRetry={loadEditions} />
        ) : editions.length === 0 ? (
          <EmptyState
            icon="podium-outline"
            title="Todavía no hay ediciones"
            description="Cuando exista una edición, su clasificación aparecerá aquí."
          />
        ) : (
          <Card>
            {editions.map((edition, index) => (
              <View key={edition.id}>
                {index > 0 ? <Divider /> : null}
                <ListRow
                  icon="podium-outline"
                  title={String(edition.year)}
                  subtitle={edition.label ?? undefined}
                  onPress={() =>
                    router.push({
                      pathname: '/rankings/editions/[id]',
                      params: { id: edition.id },
                    } as Href)
                  }
                />
              </View>
            ))}
          </Card>
        )}
      </View>
    </Screen>
  );
}


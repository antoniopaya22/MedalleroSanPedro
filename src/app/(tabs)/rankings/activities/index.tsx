import type { Href } from 'expo-router';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';

import { Card, Divider, EmptyState, HeroHeader, ListRow, Screen, Text, TextField } from '@/components/ui';
import { searchActivities } from '@/services/activities';
import { useTheme } from '@/theme';
import type { Activity } from '@/types/domain';

/**
 * Selector público de actividad (R1) para entrar a su histórico y
 * clasificación agregada: vista de solo lectura, sin ningún control de
 * escritura, accesible sin sesión (R4.1/R4.2). El filtrado se hace en cliente
 * sobre el catálogo ya cargado, igual que `activities/index` (R1.2).
 */
export default function ActivityRankingIndexScreen() {
  const { spacing } = useTheme();
  const router = useRouter();

  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const loadActivities = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) {
      setLoading(true);
    }
    setError(null);
    try {
      setActivities(await searchActivities(''));
    } catch {
      setError('No se ha podido cargar el catálogo de actividades.');
    } finally {
      if (!opts?.silent) {
        setLoading(false);
      }
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadActivities();
    }, [loadActivities])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadActivities({ silent: true });
  };

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) {
      return activities;
    }
    return activities.filter((activity) => activity.name.toLowerCase().includes(term));
  }, [activities, query]);

  return (
    <Screen scroll edges={['left', 'right']} onRefresh={handleRefresh} refreshing={refreshing}>
      <HeroHeader
        variant="compact"
        showBack
        eyebrow="RANKINGS"
        title="Clasificación por actividad"
        subtitle="Elige una actividad para ver su histórico y su clasificación."
      />
      <View style={{ gap: spacing.lg }}>
        <TextField
          label="Buscar actividad"
          placeholder="Buscar actividad"
          value={query}
          onChangeText={setQuery}
        />

        {error ? (
          <Text variant="bodySmall" color="danger">
            {error}
          </Text>
        ) : null}

        {!loading && activities.length === 0 ? (
          <EmptyState
            icon="game-controller-outline"
            title="Todavía no hay actividades"
            description="En cuanto se añada una actividad al catálogo, su clasificación aparecerá aquí."
          />
        ) : !loading && filtered.length === 0 ? (
          <EmptyState
            icon="search-outline"
            title="Sin resultados"
            description={`Sin resultados para «${query.trim()}».`}
          />
        ) : (
          <Card>
            {filtered.map((activity, index) => (
              <View key={activity.id}>
                {index > 0 ? <Divider /> : null}
                <ListRow
                  icon="podium-outline"
                  title={activity.name}
                  onPress={() =>
                    router.push({
                      pathname: '/rankings/activities/[id]',
                      params: { id: activity.id },
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

import { useRouter, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';

import { Button, Card, Divider, EmptyState, ErrorBanner, ListRow, LoadingState, Screen, Text, TextField } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { listActivities } from '@/services/activities';
import { useTheme } from '@/theme';
import type { Activity } from '@/types/domain';

/**
 * Catálogo de actividades (R4): lectura pública, visible para cualquier
 * usuario (anónimo, autenticado sin `Person` reclamada, o con `Person`
 * reclamada). El buscador también es público (R5.3). Los controles de
 * escritura (alta, edición) solo se muestran/accionan si `canWrite`
 * (R5.1/R5.2/R5.3); la garantía real la da la política RLS
 * `activities_write_claimed_person`, no este ocultado de UI.
 *
 * El filtrado del buscador se hace en cliente sobre el catálogo ya cargado
 * (R2.1/R2.2, ver desviación en `design.md`): es más simple y sin latencia
 * dado el tamaño del catálogo. `searchActivities` queda como primitivo de
 * servicio reutilizable por `f-004`, cubierto por su propio test de
 * servicio.
 */
export default function ActivitiesListScreen() {
  const { spacing } = useTheme();
  const router = useRouter();
  const { canWrite } = useAuth();

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
      const list = await listActivities();
      setActivities(list);
    } catch {
      setError('No se ha podido cargar el catálogo de actividades. Inténtalo de nuevo.');
    } finally {
      if (!opts?.silent) {
        setLoading(false);
      }
      setRefreshing(false);
    }
  }, []);

  // Recarga al enfocar la pantalla, para reflejar altas/ediciones hechas en
  // `activities/new` o `activities/[id]` al volver (R1.2/R3.1).
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
    <Screen scroll onRefresh={handleRefresh} refreshing={refreshing}>
      <View style={{ gap: spacing.lg, paddingTop: spacing.md }}>
        <Text variant="body" color="textSecondary">
          Catálogo de actividades y juegos de San Pedro.
        </Text>

        <TextField
          label="Buscar actividad"
          placeholder="Buscar actividad"
          value={query}
          onChangeText={setQuery}
        />

        {canWrite ? (
          <Button label="Añadir actividad" onPress={() => router.push('/activities/new')} fullWidth />
        ) : null}

        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorBanner message={error} onRetry={loadActivities} />
        ) : activities.length === 0 ? (
          <EmptyState
            icon="game-controller-outline"
            title="Todavía no hay actividades"
            description="En cuanto se añada una actividad al catálogo aparecerá aquí."
          />
        ) : filtered.length === 0 ? (
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
                  icon="game-controller-outline"
                  title={activity.name}
                  onPress={
                    canWrite
                      ? () => router.push({ pathname: '/activities/[id]', params: { id: activity.id } })
                      : undefined
                  }
                  showChevron={canWrite}
                />
              </View>
            ))}
          </Card>
        )}
      </View>
    </Screen>
  );
}

import { useRouter, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { Badge, Button, Card, Divider, EmptyState, ErrorBanner, HeroHeader, ListRow, LoadingState, Screen, Text } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { listEditions } from '@/services/editions';
import { useTheme } from '@/theme';
import type { Edition } from '@/types/domain';

/**
 * Listado de ediciones: lectura pública, visible para cualquier usuario
 * (anónimo, autenticado sin `Person` reclamada, o con `Person` reclamada).
 * Cualquier usuario navega a la vista de detalle pública `/editions/[id]`
 * (f-016, R1.1); solo el botón "Añadir edición" sigue condicionado a
 * `canWrite` (R4.2). La garantía real de permisos de escritura la da la
 * política RLS `editions_write_claimed_person`, no este ocultado de UI.
 */
export default function EditionsListScreen() {
  const { spacing } = useTheme();
  const router = useRouter();
  const { canWrite } = useAuth();

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
      const list = await listEditions();
      setEditions(list);
    } catch {
      setError('No se ha podido cargar el listado de ediciones. Inténtalo de nuevo.');
    } finally {
      if (!opts?.silent) {
        setLoading(false);
      }
      setRefreshing(false);
    }
  }, []);

  // Recarga al enfocar la pantalla, para reflejar altas/ediciones hechas en
  // `editions/new` o `editions/[id]` al volver (R3.3).
  useFocusEffect(
    useCallback(() => {
      loadEditions();
    }, [loadEditions])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadEditions({ silent: true });
  };

  const latestYear = editions.length > 0 ? Math.max(...editions.map((edition) => edition.year)) : undefined;

  return (
    <Screen scroll edges={['left', 'right']} onRefresh={handleRefresh} refreshing={refreshing}>
      <HeroHeader
        eyebrow="MEDALLERO"
        title="Ediciones"
        subtitle="Ediciones/años del medallero histórico de San Pedro."
      />

      <View style={{ gap: spacing.lg }}>
        {!loading && !error && editions.length > 0 ? (
          <Text variant="caption" color="textSecondary">
            {editions.length} {editions.length === 1 ? 'edición' : 'ediciones'}
            {latestYear !== undefined ? ` · ${latestYear} es la última` : ''}
          </Text>
        ) : null}

        {canWrite ? (
          <Button label="Añadir edición" onPress={() => router.push('/editions/new')} fullWidth />
        ) : null}

        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorBanner message={error} onRetry={loadEditions} />
        ) : editions.length === 0 ? (
          <EmptyState
            icon="calendar-outline"
            title="Todavía no hay ediciones"
            description="En cuanto se añada una edición aparecerá aquí."
          />
        ) : (
          <Card>
            {editions.map((edition, index) => (
              <View key={edition.id}>
                {index > 0 ? <Divider /> : null}
                <ListRow
                  icon="calendar-outline"
                  title={String(edition.year)}
                  subtitle={edition.label ?? undefined}
                  onPress={() => router.push({ pathname: '/editions/[id]', params: { id: edition.id } })}
                  showChevron
                  right={edition.year === latestYear ? <Badge label="Última" variant="primary" /> : undefined}
                />
              </View>
            ))}
          </Card>
        )}
      </View>
    </Screen>
  );
}

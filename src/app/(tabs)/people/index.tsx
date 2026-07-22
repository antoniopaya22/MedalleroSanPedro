import { useRouter, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';

import {
  Avatar,
  Badge,
  Button,
  Card,
  Divider,
  EmptyState,
  ErrorBanner,
  FilterButton,
  HeroHeader,
  ListRow,
  LoadingState,
  Screen,
  Segmented,
  Text,
  TextField,
} from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { listPeople } from '@/services/people';
import { useTheme } from '@/theme';
import type { Person } from '@/types/domain';

type StatusFilter = 'all' | 'active' | 'inactive';

const STATUS_OPTIONS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'active', label: 'Activos' },
  { key: 'inactive', label: 'Inactivos' },
];

/**
 * Listado del roster (R4): lectura pública, visible para cualquier usuario
 * (anónimo, autenticado sin `Person` reclamada, o con `Person` reclamada).
 * Cualquier usuario navega a la vista de detalle pública `/people/[id]`
 * (f-017, R1.1); los controles de escritura (alta, edición) solo se
 * muestran/accionan si `canWrite`; la garantía real la da la política RLS
 * `people_write_claimed_person`, no este ocultado de UI.
 */
export default function PeopleListScreen() {
  const { spacing } = useTheme();
  const router = useRouter();
  const { canWrite } = useAuth();

  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const loadPeople = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) {
      setLoading(true);
    }
    setError(null);
    try {
      const list = await listPeople();
      setPeople(list);
    } catch {
      setError('No se ha podido cargar el listado de personas. Inténtalo de nuevo.');
    } finally {
      if (!opts?.silent) {
        setLoading(false);
      }
      setRefreshing(false);
    }
  }, []);

  // Recarga al enfocar la pantalla, para reflejar altas/ediciones hechas en
  // `people/new` o `people/[id]` al volver (R1.2/R3.1/R2.1/R2.2).
  useFocusEffect(
    useCallback(() => {
      loadPeople();
    }, [loadPeople])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadPeople({ silent: true });
  };

  // Buscador + filtro de estado (f-021, R2), puramente en cliente sobre el
  // roster ya cargado (R2.5), combinables (R2.3).
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return people.filter((person) => {
      const matchesStatus = statusFilter === 'all' || (statusFilter === 'active') === person.active;
      const matchesQuery = !term || person.name.toLowerCase().includes(term);
      return matchesStatus && matchesQuery;
    });
  }, [people, query, statusFilter]);

  const activeCount = people.filter((person) => person.active).length;

  return (
    <Screen scroll edges={['left', 'right']} onRefresh={handleRefresh} refreshing={refreshing}>
      <HeroHeader eyebrow="MEDALLERO" title="Participantes" subtitle="Roster histórico de personas de San Pedro." />

      <View style={{ gap: spacing.lg }}>
        {!loading && !error && people.length > 0 ? (
          <Text variant="caption" color="textSecondary">
            {people.length} {people.length === 1 ? 'participante' : 'participantes'} · {activeCount} activos
          </Text>
        ) : null}

        {canWrite ? (
          <Button label="Añadir persona" onPress={() => router.push('/people/new')} fullWidth />
        ) : null}

        {!loading && !error && people.length > 0 ? (
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <TextField label="Buscar participante" placeholder="Buscar participante" value={query} onChangeText={setQuery} />
            </View>
            <FilterButton
              title="Filtrar participantes"
              activeCount={statusFilter === 'all' ? 0 : 1}
              valueLabel={STATUS_OPTIONS.find((option) => option.key === statusFilter && option.key !== 'all')?.label}
            >
              <Segmented options={STATUS_OPTIONS} value={statusFilter} onChange={setStatusFilter} fullWidth />
            </FilterButton>
          </View>
        ) : null}

        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorBanner message={error} onRetry={loadPeople} />
        ) : people.length === 0 ? (
          <EmptyState
            icon="people-outline"
            title="Todavía no hay personas"
            description="En cuanto se añada una persona al roster aparecerá aquí."
          />
        ) : filtered.length === 0 ? (
          <EmptyState icon="search-outline" title="Sin resultados" description="Prueba a cambiar el buscador o el filtro." />
        ) : (
          <Card>
            {filtered.map((person, index) => (
              <View key={person.id}>
                {index > 0 ? <Divider /> : null}
                <ListRow
                  left={<Avatar name={person.name} size={36} />}
                  title={person.name}
                  onPress={() => router.push({ pathname: '/people/[id]', params: { id: person.id } })}
                  showChevron
                  right={!person.active ? <Badge label="Inactiva" variant="neutral" /> : undefined}
                />
              </View>
            ))}
          </Card>
        )}
      </View>
    </Screen>
  );
}

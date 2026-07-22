import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, View } from 'react-native';

import { Button, Card, Divider, EmptyState, ListRow, LoadingState, Screen, Text, TextField } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { claimPerson, listClaimablePeople, PersonAlreadyClaimedError } from '@/services/people';
import { useTheme } from '@/theme';
import type { Person } from '@/types/domain';

/**
 * Onboarding obligatorio (R2.2): mientras el `Profile` no tenga `personId`,
 * `AuthGate` mantiene al usuario aquí. Sin botón de "volver": la única salida
 * alternativa es cerrar sesión (R2.2, diseño).
 */
export default function ClaimPersonScreen() {
  const { spacing } = useTheme();
  const { signOut, refreshProfile } = useAuth();

  const [people, setPeople] = useState<Person[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const loadPeople = useCallback(async () => {
    setLoadingList(true);
    try {
      const list = await listClaimablePeople();
      setPeople(list);
    } catch {
      setError('No se ha podido cargar la lista de personas. Inténtalo de nuevo.');
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    loadPeople();
  }, [loadPeople]);

  const filteredPeople = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) {
      return people;
    }
    return people.filter((person) => person.name.toLowerCase().includes(term));
  }, [people, query]);

  const doClaim = async () => {
    if (!selectedId) {
      return;
    }
    setError(null);
    setClaiming(true);
    try {
      await claimPerson(selectedId);
      await refreshProfile();
      // El `AuthGate` desbloquea la app en cuanto `hasClaimedPerson` sea true.
    } catch (err) {
      if (err instanceof PersonAlreadyClaimedError) {
        setError(err.message);
        setSelectedId(null);
        await loadPeople();
      } else {
        setError('No se ha podido completar la reclamación. Inténtalo de nuevo.');
      }
    } finally {
      setClaiming(false);
    }
  };

  // Reclamar una persona es, hoy, una decisión sin vuelta atrás por parte del
  // propio usuario (ADR 0002/0005: no hay pantalla de "cambiar mi persona").
  // Un solo diálogo de confirmación con el nombre de por medio evita que un
  // toque equivocado en la lista quede fijado para siempre sin querer.
  const handleConfirm = () => {
    if (!selectedId) {
      return;
    }
    const selectedPerson = people.find((person) => person.id === selectedId);

    Alert.alert(
      '¿Confirmas quién eres?',
      `Vas a reclamar a «${selectedPerson?.name ?? ''}». No podrás cambiarlo tú mismo más adelante.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Confirmar', onPress: doClaim },
      ]
    );
  };

  return (
    <Screen scroll>
      <View style={{ gap: spacing.lg, paddingTop: spacing.lg }}>
        <View style={{ gap: spacing.xxs }}>
          <Text variant="display">Reclama tu persona</Text>
          <Text variant="body" color="textSecondary">
            Selecciona quién eres en el histórico de San Pedro para poder registrar resultados y
            medallas.
          </Text>
        </View>

        {error ? (
          <Text variant="bodySmall" color="danger">
            {error}
          </Text>
        ) : null}

        {loadingList ? (
          <LoadingState />
        ) : people.length === 0 ? (
          <EmptyState
            icon="people-outline"
            title="No quedan personas por reclamar"
            description="Todas las personas del histórico ya han sido reclamadas por otro usuario."
          />
        ) : (
          <>
            <TextField label="Buscar tu nombre" placeholder="Buscar por nombre" value={query} onChangeText={setQuery} />

            {filteredPeople.length === 0 ? (
              <EmptyState
                icon="search-outline"
                title="Sin resultados"
                description={`Sin resultados para «${query.trim()}».`}
              />
            ) : (
              <Card>
                {filteredPeople.map((person, index) => (
                  <View key={person.id}>
                    {index > 0 ? <Divider /> : null}
                    <ListRow
                      title={person.name}
                      onPress={() => setSelectedId(person.id)}
                      showChevron={false}
                      selected={selectedId === person.id}
                    />
                  </View>
                ))}
              </Card>
            )}
          </>
        )}

        <Button
          label="Confirmar"
          onPress={handleConfirm}
          loading={claiming}
          disabled={!selectedId}
          fullWidth
        />

        <Button label="Cerrar sesión" variant="ghost" onPress={signOut} fullWidth />
      </View>
    </Screen>
  );
}

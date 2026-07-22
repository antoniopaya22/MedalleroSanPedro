import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';

import { Button, LoadingState, Screen, Text, TextField } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { listPeople, PersonNameTakenError, updatePerson } from '@/services/people';
import { useTheme } from '@/theme';
import type { Person } from '@/types/domain';

/**
 * Edición de una `Person` existente: renombrar (R4.1) y alternar `active`.
 * Movido desde el antiguo `[id].tsx` (f-017): la ruta `/people/[id]` pasa a
 * ser la vista de detalle pública, y este formulario vive ahora en
 * `/people/[id]/edit`. Igual que `new.tsx`, redirige si `!canWrite` (R4.2),
 * defensa en profundidad junto a la política RLS `people_write_claimed_person`.
 */
export default function EditPersonScreen() {
  const { spacing } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { canWrite } = useAuth();

  const [person, setPerson] = useState<Person | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [togglingActive, setTogglingActive] = useState(false);

  const loadPerson = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await listPeople();
      const found = list.find((candidate) => candidate.id === id) ?? null;
      setPerson(found);
      setName(found?.name ?? '');
    } catch {
      setError('No se ha podido cargar la persona. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!canWrite) {
      // R4.2: sin canWrite se redirige fuera del formulario, a la vista de
      // detalle pública (defensa en profundidad; la garantía real es RLS).
      router.replace({ pathname: '/people/[id]', params: { id } });
      return;
    }
    loadPerson();
  }, [canWrite, router, id, loadPerson]);

  if (!canWrite) {
    return null;
  }

  const handleSaveName = async () => {
    if (!name.trim()) {
      setNameError('El nombre no puede estar vacío.');
      return;
    }
    setNameError(null);
    setError(null);
    setSaving(true);
    try {
      const updated = await updatePerson(id, { name });
      setPerson(updated);
      setName(updated.name);
    } catch (err) {
      if (err instanceof PersonNameTakenError) {
        setNameError(err.message);
      } else {
        setError('No se ha podido guardar el nombre. Inténtalo de nuevo.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async () => {
    if (!person) {
      return;
    }
    setError(null);
    setTogglingActive(true);
    try {
      const updated = await updatePerson(person.id, { active: !person.active });
      setPerson(updated);
    } catch {
      setError('No se ha podido actualizar el estado. Inténtalo de nuevo.');
    } finally {
      setTogglingActive(false);
    }
  };

  if (loading) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }

  if (!person) {
    return (
      <Screen>
        <Text variant="body" color="danger">
          No se ha encontrado esa persona.
        </Text>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <View style={{ gap: spacing.lg, paddingTop: spacing.md }}>
        <TextField label="Nombre" value={name} onChangeText={setName} error={nameError} />

        {error ? (
          <Text variant="bodySmall" color="danger">
            {error}
          </Text>
        ) : null}

        <Button label="Guardar" onPress={handleSaveName} loading={saving} fullWidth />

        <View style={{ gap: spacing.xxs }}>
          <Text variant="body" color="textSecondary">
            Marcar como inactiva no borra su histórico de medallas ni de resultados: es
            reversible en cualquier momento.
          </Text>
          <Button
            label={person.active ? 'Marcar como inactiva' : 'Marcar como activa'}
            variant={person.active ? 'destructive' : 'secondary'}
            onPress={handleToggleActive}
            loading={togglingActive}
            fullWidth
          />
        </View>
      </View>
    </Screen>
  );
}

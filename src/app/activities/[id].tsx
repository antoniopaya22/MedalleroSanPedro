import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';

import { Button, LoadingState, Screen, Text, TextField } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { ActivityNameTakenError, listActivities, updateActivity } from '@/services/activities';
import { useTheme } from '@/theme';
import type { Activity } from '@/types/domain';

/**
 * Renombrado de una `Activity` existente (R3). Igual que `new.tsx`, redirige
 * si `!canWrite` (R5.1/R5.2), defensa en profundidad junto a la política RLS
 * `activities_write_claimed_person`.
 */
export default function EditActivityScreen() {
  const { spacing } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { canWrite } = useAuth();

  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadActivity = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await listActivities();
      const found = list.find((candidate) => candidate.id === id) ?? null;
      setActivity(found);
      setName(found?.name ?? '');
    } catch {
      setError('No se ha podido cargar la actividad. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!canWrite) {
      router.replace('/activities/index');
      return;
    }
    loadActivity();
  }, [canWrite, router, loadActivity]);

  if (!canWrite) {
    return null;
  }

  const handleSave = async () => {
    if (!name.trim()) {
      setNameError('El nombre no puede estar vacío.');
      return;
    }
    setNameError(null);
    setError(null);
    setSaving(true);
    try {
      const updated = await updateActivity(id, name);
      setActivity(updated);
      setName(updated.name);
      router.back();
    } catch (err) {
      if (err instanceof ActivityNameTakenError) {
        setNameError(err.message);
      } else {
        setError('No se ha podido guardar el nombre. Inténtalo de nuevo.');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }

  if (!activity) {
    return (
      <Screen>
        <Text variant="body" color="danger">
          No se ha encontrado esa actividad.
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

        <Button label="Guardar" onPress={handleSave} loading={saving} fullWidth />
      </View>
    </Screen>
  );
}

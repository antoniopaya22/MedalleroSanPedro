import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';

import { Button, Card, Divider, ListRow, Screen, Text, TextField } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { ActivityNameTakenError, createActivity, listActivities } from '@/services/activities';
import { useTheme } from '@/theme';
import type { Activity } from '@/types/domain';

/**
 * Alta de una nueva `Activity` (R1). Defensa en profundidad junto a la
 * política RLS `activities_write_claimed_person` (R5.1/R5.2): si `canWrite`
 * es falso (anónimo o autenticado sin `Person` reclamada) se redirige al
 * catálogo sin mostrar el formulario, aunque la ruta se pidiese directamente.
 *
 * Muestra coincidencias en vivo mientras se escribe (R2.3), para invitar a
 * reutilizar una `Activity` existente en vez de crear un duplicado: es el
 * propósito central de la feature, complementado por el índice único
 * case-insensitive de la BBDD (R1.5).
 */
export default function NewActivityScreen() {
  const { spacing } = useTheme();
  const router = useRouter();
  const { canWrite } = useAuth();

  const [name, setName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [existingActivities, setExistingActivities] = useState<Activity[]>([]);

  useEffect(() => {
    if (!canWrite) {
      router.replace('/activities/index');
      return;
    }
    listActivities()
      .then(setExistingActivities)
      .catch(() => {
        // Las coincidencias en vivo son solo ayuda; si falla la carga, el
        // alta sigue funcionando sin ese apoyo.
      });
  }, [canWrite, router]);

  const matches = useMemo(() => {
    const term = name.trim().toLowerCase();
    if (!term) {
      return [];
    }
    return existingActivities.filter((activity) => activity.name.toLowerCase().includes(term));
  }, [existingActivities, name]);

  if (!canWrite) {
    return null;
  }

  const handleCreate = async () => {
    if (!name.trim()) {
      setNameError('El nombre no puede estar vacío.');
      return;
    }
    setNameError(null);
    setError(null);
    setSaving(true);
    try {
      await createActivity(name);
      router.back();
    } catch (err) {
      if (err instanceof ActivityNameTakenError) {
        setNameError(err.message);
      } else {
        setError('No se ha podido crear la actividad. Inténtalo de nuevo.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen scroll>
      <View style={{ gap: spacing.lg, paddingTop: spacing.md }}>
        <Text variant="body" color="textSecondary">
          Añade una actividad o juego al catálogo de San Pedro.
        </Text>

        <TextField label="Nombre" value={name} onChangeText={setName} error={nameError} autoFocus />

        {matches.length > 0 ? (
          <View style={{ gap: spacing.xxs }}>
            <Text variant="bodySmall" color="textSecondary">
              Ya existe algo parecido — toca una para usar su nombre exacto y evitar un duplicado.
            </Text>
            <Card>
              {matches.map((activity, index) => (
                <View key={activity.id}>
                  {index > 0 ? <Divider /> : null}
                  <ListRow title={activity.name} onPress={() => setName(activity.name)} showChevron={false} />
                </View>
              ))}
            </Card>
          </View>
        ) : null}

        {error ? (
          <Text variant="bodySmall" color="danger">
            {error}
          </Text>
        ) : null}

        <Button label="Crear" onPress={handleCreate} loading={saving} fullWidth />
      </View>
    </Screen>
  );
}

import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Button, Screen, Text, TextField } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { createPerson, PersonNameTakenError } from '@/services/people';
import { useTheme } from '@/theme';

/**
 * Alta de una nueva `Person` (R1). Defensa en profundidad junto a la política
 * RLS `people_write_claimed_person` (R5.1/R5.2): si `canWrite` es falso
 * (anónimo o autenticado sin `Person` reclamada) se redirige al listado sin
 * mostrar el formulario, aunque la ruta se pidiese directamente.
 */
export default function NewPersonScreen() {
  const { spacing } = useTheme();
  const router = useRouter();
  const { canWrite } = useAuth();

  const [name, setName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!canWrite) {
      router.replace('/people/index');
    }
  }, [canWrite, router]);

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
      await createPerson(name);
      router.back();
    } catch (err) {
      if (err instanceof PersonNameTakenError) {
        setNameError(err.message);
      } else {
        setError('No se ha podido crear la persona. Inténtalo de nuevo.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen scroll>
      <View style={{ gap: spacing.lg, paddingTop: spacing.md }}>
        <Text variant="body" color="textSecondary">
          Añade una persona al roster histórico de San Pedro.
        </Text>

        <TextField label="Nombre" value={name} onChangeText={setName} error={nameError} autoFocus />

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

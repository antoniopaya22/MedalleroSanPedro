import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Button, Screen, Text, TextField } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { createEdition, EditionYearTakenError } from '@/services/editions';
import { useTheme } from '@/theme';

/**
 * Alta de una nueva `Edition` (R1). Defensa en profundidad junto a la
 * política RLS `editions_write_claimed_person` (R4.2/R4.3): si `canWrite` es
 * falso (anónimo o autenticado sin `Person` reclamada) se redirige al
 * listado sin mostrar el formulario, aunque la ruta se pidiese directamente.
 */
export default function NewEditionScreen() {
  const { spacing } = useTheme();
  const router = useRouter();
  const { canWrite } = useAuth();

  const [year, setYear] = useState('');
  const [yearError, setYearError] = useState<string | null>(null);
  const [label, setLabel] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [datesError, setDatesError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!canWrite) {
      router.replace('/editions/index');
    }
  }, [canWrite, router]);

  if (!canWrite) {
    return null;
  }

  const handleCreate = async () => {
    setYearError(null);
    setDatesError(null);
    setError(null);

    const trimmedYear = year.trim();
    const parsedYear = Number(trimmedYear);
    if (!trimmedYear || !Number.isInteger(parsedYear)) {
      setYearError('El año debe ser un número entero.');
      return;
    }

    const trimmedStartDate = startDate.trim();
    const trimmedEndDate = endDate.trim();
    if (trimmedStartDate && trimmedEndDate && trimmedEndDate < trimmedStartDate) {
      setDatesError('La fecha de fin no puede ser anterior a la de inicio.');
      return;
    }

    setSaving(true);
    try {
      await createEdition({
        year: parsedYear,
        label,
        startDate: trimmedStartDate || null,
        endDate: trimmedEndDate || null,
      });
      router.back();
    } catch (err) {
      if (err instanceof EditionYearTakenError) {
        setError('Ya existe una edición para ese año.');
      } else {
        setError('No se ha podido crear la edición. Inténtalo de nuevo.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen scroll>
      <View style={{ gap: spacing.lg, paddingTop: spacing.md }}>
        <Text variant="body" color="textSecondary">
          Añade una edición/año al medallero histórico de San Pedro.
        </Text>

        <TextField
          label="Año"
          value={year}
          onChangeText={setYear}
          error={yearError}
          keyboardType="number-pad"
          autoFocus
        />

        <TextField label="Etiqueta (opcional)" value={label} onChangeText={setLabel} />

        <TextField
          label="Fecha de inicio (opcional)"
          value={startDate}
          onChangeText={setStartDate}
          placeholder="YYYY-MM-DD"
          error={datesError}
        />

        <TextField label="Fecha de fin (opcional)" value={endDate} onChangeText={setEndDate} placeholder="YYYY-MM-DD" />

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

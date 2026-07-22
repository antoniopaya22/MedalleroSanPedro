import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';

import { Button, LoadingState, Screen, Text, TextField } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { EditionYearTakenError, listEditions, updateEdition } from '@/services/editions';
import { useTheme } from '@/theme';
import type { Edition } from '@/types/domain';

/**
 * Edición de una `Edition` existente (R4). Movido desde el antiguo
 * `[id].tsx` (f-016): la ruta `/editions/[id]` pasa a ser la vista de
 * detalle pública, y este formulario vive ahora en `/editions/[id]/edit`.
 * Igual que `new.tsx`, redirige si `!canWrite` (R4.2), defensa en
 * profundidad junto a la política RLS `editions_write_claimed_person`.
 * Carga la lista completa y busca por `id` (mismo enfoque que `people/[id]`,
 * evita un `getEdition` de un solo uso).
 */
export default function EditEditionScreen() {
  const { spacing } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { canWrite } = useAuth();

  const [edition, setEdition] = useState<Edition | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [year, setYear] = useState('');
  const [yearError, setYearError] = useState<string | null>(null);
  const [label, setLabel] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [datesError, setDatesError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadEdition = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const list = await listEditions();
      const found = list.find((candidate) => candidate.id === id) ?? null;
      setEdition(found);
      setYear(found ? String(found.year) : '');
      setLabel(found?.label ?? '');
      setStartDate(found?.startDate ?? '');
      setEndDate(found?.endDate ?? '');
    } catch {
      setLoadError('No se ha podido cargar la edición. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!canWrite) {
      // R4.2: sin canWrite se redirige fuera del formulario, a la vista de
      // detalle pública (defensa en profundidad; la garantía real es RLS).
      router.replace({ pathname: '/editions/[id]', params: { id } });
      return;
    }
    loadEdition();
  }, [canWrite, router, id, loadEdition]);

  if (!canWrite) {
    return null;
  }

  const handleSave = async () => {
    if (!edition) {
      return;
    }

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
      const updated = await updateEdition(edition.id, {
        year: parsedYear,
        label,
        startDate: trimmedStartDate || null,
        endDate: trimmedEndDate || null,
      });
      setEdition(updated);
      setYear(String(updated.year));
      setLabel(updated.label ?? '');
      setStartDate(updated.startDate ?? '');
      setEndDate(updated.endDate ?? '');
    } catch (err) {
      if (err instanceof EditionYearTakenError) {
        setError('Ya existe una edición para ese año.');
      } else {
        setError('No se ha podido guardar la edición. Inténtalo de nuevo.');
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

  if (!edition) {
    return (
      <Screen>
        <Text variant="body" color="danger">
          {loadError ?? 'No se ha encontrado esa edición.'}
        </Text>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <View style={{ gap: spacing.lg, paddingTop: spacing.md }}>
        <TextField label="Año" value={year} onChangeText={setYear} error={yearError} keyboardType="number-pad" />

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

        <Button label="Guardar" onPress={handleSave} loading={saving} fullWidth />
      </View>
    </Screen>
  );
}

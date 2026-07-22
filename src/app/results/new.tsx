import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, Divider, ErrorBanner, ListRow, LoadingState, Screen, Text, TextField } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { ActivityNameTakenError, createActivity, listActivities } from '@/services/activities';
import { createActivityResult, deleteActivityResult, getActivityResultDetail, updateActivityResult } from '@/services/activityResults';
import { listEditions } from '@/services/editions';
import { listPeople } from '@/services/people';
import { useTheme } from '@/theme';
import type { Activity, Edition, Medal, Person } from '@/types/domain';

const MEDALS: Array<{ medal: Medal; label: string; color: 'medalGold' | 'medalSilver' | 'medalBronze' }> = [
  { medal: 'gold', label: 'Oro', color: 'medalGold' },
  { medal: 'silver', label: 'Plata', color: 'medalSilver' },
  { medal: 'bronze', label: 'Bronce', color: 'medalBronze' },
];

type MedalSelections = Record<Medal, string[]>;

const EMPTY_MEDALS: MedalSelections = { gold: [], silver: [], bronze: [] };

// Asistente por pasos (f-019): un paso a la vez en lugar del formulario largo
// con scroll único de f-004. El orden y los mensajes de validación son
// exactamente los mismos que tenía el formulario original.
enum Step {
  Edition = 0,
  Activity = 1,
  Participants = 2,
  Medals = 3,
  Details = 4,
  Summary = 5,
}

const STEP_TITLES: Record<Step, string> = {
  [Step.Edition]: 'Edición',
  [Step.Activity]: 'Actividad',
  [Step.Participants]: 'Participantes',
  [Step.Medals]: 'Medallas',
  [Step.Details]: 'Detalles',
  [Step.Summary]: 'Resumen',
};

const TOTAL_STEPS = 6;
const LAST_STEP = Step.Summary;

function SectionCard({
  number,
  title,
  accentColor,
  children,
}: {
  number: number;
  title: string;
  accentColor?: string;
  children: ReactNode;
}) {
  const { colors, radius, spacing } = useTheme();

  return (
    <View style={{ gap: spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <View
          style={{
            width: 24,
            height: 24,
            borderRadius: radius.pill,
            backgroundColor: accentColor ?? colors.primaryMuted,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {accentColor ? null : (
            <Text variant="caption" style={{ color: colors.primary }}>
              {number}
            </Text>
          )}
        </View>
        <Text variant="subtitle">{title}</Text>
      </View>
      {children}
    </View>
  );
}

function ProgressIndicator({ step, title }: { step: Step; title: string }) {
  const { colors, radius, spacing } = useTheme();

  return (
    <View style={{ gap: spacing.xs }}>
      <Text variant="caption" color="textSecondary">{`Paso ${step + 1} de ${TOTAL_STEPS}`}</Text>
      <Text variant="subtitle">{title}</Text>
      <View
        style={{
          height: 6,
          borderRadius: radius.pill,
          backgroundColor: colors.surfaceAlt,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            width: `${((step + 1) / TOTAL_STEPS) * 100}%`,
            height: '100%',
            borderRadius: radius.pill,
            backgroundColor: colors.primary,
          }}
        />
      </View>
    </View>
  );
}

function SummaryBlock({ title, onEdit, children }: { title: string; onEdit: () => void; children: ReactNode }) {
  const { spacing } = useTheme();

  return (
    <Card>
      <View style={{ gap: spacing.xs }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text variant="subtitle">{title}</Text>
          <Button label={`Editar ${title.toLowerCase()}`} variant="ghost" size="sm" onPress={onEdit} />
        </View>
        {children}
      </View>
    </Card>
  );
}

export default function NewResultScreen() {
  const { colors, spacing } = useTheme();
  const router = useRouter();
  const { canWrite } = useAuth();
  // Edición preseleccionada al llegar desde el FAB del detalle de edición
  // (f-016, R3.2/R3.3), o participante preseleccionado al llegar desde el FAB
  // del detalle de persona (f-017, R3.2/R3.3); si no llegan, el formulario
  // arranca igual que antes. `resultId` (plan de mejoras, fase 1): abre el
  // asistente en modo edición sobre una prueba ya registrada, precargada en
  // el paso Resumen en vez de arrancar vacío.
  const { editionId, participantId, resultId } = useLocalSearchParams<{
    editionId?: string;
    participantId?: string;
    resultId?: string;
  }>();
  const isEditing = Boolean(resultId);

  const [editions, setEditions] = useState<Edition[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [selectedEditionId, setSelectedEditionId] = useState('');
  const [selectedActivityId, setSelectedActivityId] = useState('');
  const [activityQuery, setActivityQuery] = useState('');
  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [medals, setMedals] = useState<MedalSelections>(EMPTY_MEDALS);
  const [playedAt, setPlayedAt] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [creatingActivity, setCreatingActivity] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activityError, setActivityError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<Step>(Step.Edition);

  useEffect(() => {
    if (!canWrite) {
      router.replace('/');
      return;
    }

    setLoading(true);
    setError(null);

    async function load() {
      const [editionList, activityList, peopleList] = await Promise.all([listEditions(), listActivities(), listPeople()]);
      setEditions(editionList);
      setActivities(activityList);

      if (resultId) {
        // Modo edición: se cargan TODAS las personas (no solo activas) para
        // que un participante que hoy esté marcado inactivo siga siendo
        // visible/editable en una prueba histórica en la que sí participó.
        setPeople(peopleList);

        const detail = await getActivityResultDetail(resultId);
        setSelectedEditionId(detail.editionId);
        setSelectedActivityId(detail.activityId);
        setActivityQuery(activityList.find((activity) => activity.id === detail.activityId)?.name ?? '');
        setParticipantIds(detail.participantIds);
        setMedals({
          gold: detail.medalAwards.find((award) => award.medal === 'gold')?.personIds ?? [],
          silver: detail.medalAwards.find((award) => award.medal === 'silver')?.personIds ?? [],
          bronze: detail.medalAwards.find((award) => award.medal === 'bronze')?.personIds ?? [],
        });
        setPlayedAt(detail.playedAt ?? '');
        setNotes(detail.notes ?? '');
        setCurrentStep(Step.Summary);
        return;
      }

      const activePeople = peopleList.filter((person) => person.active);
      setPeople(activePeople);
      const editionResolved = Boolean(editionId && editionList.some((edition) => edition.id === editionId));
      if (editionResolved) {
        setSelectedEditionId(editionId as string);
      }
      // R3.3: solo preselecciona si la persona está entre las activas
      // cargadas; una persona inactiva simplemente no se preselecciona
      // (coherente con que el FAB del detalle no se muestra para inactivas).
      if (participantId && activePeople.some((person) => person.id === participantId)) {
        setParticipantIds([participantId]);
      }
      // R5.3: arranca en el primer paso obligatorio que NO quede resuelto
      // por la preselección. Un participantId por sí solo no resuelve el
      // paso Edición (obligatorio y previo), así que en ese caso se
      // arranca igualmente en Edición con la persona ya añadida.
      setCurrentStep(editionResolved ? Step.Activity : Step.Edition);
    }

    load()
      .catch(() => {
        setError(
          resultId
            ? 'No se ha podido cargar la prueba para editarla.'
            : 'No se han podido cargar los datos para registrar la prueba.'
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, [canWrite, router, editionId, participantId, resultId]);

  const activityMatches = useMemo(() => {
    const term = activityQuery.trim().toLowerCase();
    if (!term) {
      return activities;
    }
    return activities.filter((activity) => activity.name.toLowerCase().includes(term));
  }, [activities, activityQuery]);

  const selectedActivity = activities.find((activity) => activity.id === selectedActivityId) ?? null;
  const selectedEdition = editions.find((edition) => edition.id === selectedEditionId) ?? null;

  if (!canWrite) {
    return null;
  }

  const toggleParticipant = (personId: string) => {
    setParticipantIds((current) => {
      if (current.includes(personId)) {
        setMedals((currentMedals) => ({
          gold: currentMedals.gold.filter((id) => id !== personId),
          silver: currentMedals.silver.filter((id) => id !== personId),
          bronze: currentMedals.bronze.filter((id) => id !== personId),
        }));
        return current.filter((id) => id !== personId);
      }
      return [...current, personId];
    });
  };

  const toggleMedal = (medal: Medal, personId: string) => {
    setMedals((current) => {
      const alreadySelected = current[medal].includes(personId);
      return {
        gold: medal === 'gold' && !alreadySelected ? [...current.gold, personId] : current.gold.filter((id) => id !== personId),
        silver:
          medal === 'silver' && !alreadySelected
            ? [...current.silver, personId]
            : current.silver.filter((id) => id !== personId),
        bronze:
          medal === 'bronze' && !alreadySelected
            ? [...current.bronze, personId]
            : current.bronze.filter((id) => id !== personId),
      };
    });
  };

  const handleCreateActivity = async () => {
    const name = activityQuery.trim();
    if (!name) {
      setActivityError('Escribe el nombre de la actividad.');
      return;
    }

    setActivityError(null);
    setCreatingActivity(true);
    try {
      const created = await createActivity(name);
      setActivities((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name)));
      setSelectedActivityId(created.id);
      setActivityQuery(created.name);
    } catch (err) {
      if (err instanceof ActivityNameTakenError) {
        setActivityError(err.message);
      } else {
        setActivityError('No se ha podido crear la actividad.');
      }
    } finally {
      setCreatingActivity(false);
    }
  };

  const handleSave = async () => {
    setError(null);
    if (!selectedEditionId) {
      setError('Elige una edición.');
      return;
    }
    if (!selectedActivityId) {
      setError('Elige una actividad.');
      return;
    }
    if (participantIds.length === 0) {
      setError('Selecciona al menos un participante.');
      return;
    }
    if (MEDALS.every(({ medal }) => medals[medal].length === 0)) {
      setError('Asigna al menos una medalla.');
      return;
    }

    const payload = {
      editionId: selectedEditionId,
      activityId: selectedActivityId,
      participantIds,
      playedAt: playedAt.trim() || null,
      notes,
      medalAwards: MEDALS.map(({ medal }) => ({ medal, personIds: medals[medal] })).filter(
        (award) => award.personIds.length > 0
      ),
    };

    setSaving(true);
    try {
      if (resultId) {
        await updateActivityResult(resultId, payload);
      } else {
        await createActivityResult(payload);
      }
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se ha podido guardar la prueba.');
    } finally {
      setSaving(false);
    }
  };

  // Borrar es la única forma de corregir un despiste grave (edición/actividad
  // equivocada desde el principio) sin tener que rehacer todos los pasos:
  // confirmación explícita porque no hay deshacer una vez borrado.
  const handleDelete = () => {
    if (!resultId) {
      return;
    }
    Alert.alert('¿Eliminar esta prueba?', 'Se borrará junto con sus medallas. No se puede deshacer.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          setError(null);
          try {
            await deleteActivityResult(resultId);
            router.back();
          } catch {
            setError('No se ha podido eliminar la prueba. Inténtalo de nuevo.');
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  };

  // R3: valida el paso actual antes de dejar avanzar, reutilizando
  // literalmente los mismos mensajes que usaba la cascada de handleSave.
  const validateStep = (step: Step): string | null => {
    switch (step) {
      case Step.Edition:
        return selectedEditionId ? null : 'Elige una edición.';
      case Step.Activity:
        return selectedActivityId ? null : 'Elige una actividad.';
      case Step.Participants:
        return participantIds.length > 0 ? null : 'Selecciona al menos un participante.';
      case Step.Medals:
        return MEDALS.every(({ medal }) => medals[medal].length === 0) ? 'Asigna al menos una medalla.' : null;
      default:
        return null;
    }
  };

  const goNext = () => {
    const message = validateStep(currentStep);
    if (message) {
      setError(message);
      return;
    }
    setError(null);
    setCurrentStep((step) => Math.min(step + 1, LAST_STEP));
  };

  const goBack = () => {
    setError(null);
    setCurrentStep((step) => Math.max(step - 1, Step.Edition));
  };

  const goToStep = (step: Step) => {
    setError(null);
    setCurrentStep(step);
  };

  if (loading) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }

  const participantNames = people.filter((person) => participantIds.includes(person.id)).map((person) => person.name);
  const medalNames = (medal: Medal) =>
    people.filter((person) => medals[medal].includes(person.id)).map((person) => person.name);

  const renderStepContent = () => {
    switch (currentStep) {
      case Step.Edition:
        return (
          <View style={{ gap: spacing.md }}>
            <Text variant="body" color="textSecondary">
              Elige la edición de la prueba.
            </Text>
            <Card>
              {editions.map((edition, index) => (
                <View key={edition.id}>
                  {index > 0 ? <Divider /> : null}
                  <ListRow
                    title={String(edition.year)}
                    subtitle={edition.label ?? undefined}
                    onPress={() => setSelectedEditionId(edition.id)}
                    selected={selectedEditionId === edition.id}
                    showChevron={false}
                  />
                </View>
              ))}
            </Card>
          </View>
        );

      case Step.Activity:
        return (
          <View style={{ gap: spacing.md }}>
            <Text variant="body" color="textSecondary">
              Busca una actividad existente o crea una nueva.
            </Text>
            <TextField
              label="Buscar o crear actividad"
              value={activityQuery}
              onChangeText={setActivityQuery}
              error={activityError}
            />
            {selectedActivity ? (
              <Text variant="bodySmall" color="textSecondary">
                Actividad elegida: {selectedActivity.name}
              </Text>
            ) : null}
            <Card>
              {activityMatches.map((activity, index) => (
                <View key={activity.id}>
                  {index > 0 ? <Divider /> : null}
                  <ListRow
                    title={activity.name}
                    onPress={() => {
                      setSelectedActivityId(activity.id);
                      setActivityQuery(activity.name);
                    }}
                    selected={selectedActivityId === activity.id}
                    showChevron={false}
                  />
                </View>
              ))}
            </Card>
            <Button
              label="Crear y seleccionar actividad"
              variant="outline"
              onPress={handleCreateActivity}
              loading={creatingActivity}
              fullWidth
            />
          </View>
        );

      case Step.Participants:
        return (
          <View style={{ gap: spacing.md }}>
            <Text variant="body" color="textSecondary">
              Elige quién participó en la prueba.
            </Text>
            <Card>
              {people.map((person, index) => (
                <View key={person.id}>
                  {index > 0 ? <Divider /> : null}
                  <ListRow
                    title={person.name}
                    onPress={() => toggleParticipant(person.id)}
                    selected={participantIds.includes(person.id)}
                    showChevron={false}
                  />
                </View>
              ))}
            </Card>
          </View>
        );

      case Step.Medals:
        return (
          <View style={{ gap: spacing.lg }}>
            {participantIds.length === 0 ? (
              <Text variant="bodySmall" color="textSecondary">
                Elige participantes para poder asignar medallas.
              </Text>
            ) : (
              MEDALS.map(({ medal, label, color }, index) => (
                <SectionCard key={medal} number={index + 1} title={label} accentColor={colors[color]}>
                  <Card>
                    {people
                      .filter((person) => participantIds.includes(person.id))
                      .map((person, personIndex) => (
                        <View key={person.id}>
                          {personIndex > 0 ? <Divider /> : null}
                          <ListRow
                            title={person.name}
                            onPress={() => toggleMedal(medal, person.id)}
                            selected={medals[medal].includes(person.id)}
                            selectedColor={color}
                            showChevron={false}
                          />
                        </View>
                      ))}
                  </Card>
                </SectionCard>
              ))
            )}
          </View>
        );

      case Step.Details:
        return (
          <View style={{ gap: spacing.md }}>
            <Text variant="body" color="textSecondary">
              Fecha y notas de la prueba (opcionales).
            </Text>
            <TextField label="Fecha (opcional)" placeholder="YYYY-MM-DD" value={playedAt} onChangeText={setPlayedAt} />
            <TextField label="Notas (opcional)" value={notes} onChangeText={setNotes} />
          </View>
        );

      case Step.Summary:
      default:
        return (
          <View style={{ gap: spacing.md }}>
            <SummaryBlock title="Edición" onEdit={() => goToStep(Step.Edition)}>
              <Text variant="body">
                {selectedEdition ? `${selectedEdition.year}${selectedEdition.label ? ` · ${selectedEdition.label}` : ''}` : '-'}
              </Text>
            </SummaryBlock>

            <SummaryBlock title="Actividad" onEdit={() => goToStep(Step.Activity)}>
              <Text variant="body">{selectedActivity?.name ?? '-'}</Text>
            </SummaryBlock>

            <SummaryBlock title="Participantes" onEdit={() => goToStep(Step.Participants)}>
              <Text variant="body">{participantNames.length > 0 ? participantNames.join(', ') : '-'}</Text>
            </SummaryBlock>

            <SummaryBlock title="Medallas" onEdit={() => goToStep(Step.Medals)}>
              {MEDALS.map(({ medal, label, color }) => (
                <Text key={medal} variant="bodySmall" style={{ color: colors[color] }}>
                  {label}: {medalNames(medal).length > 0 ? medalNames(medal).join(', ') : '-'}
                </Text>
              ))}
            </SummaryBlock>

            <SummaryBlock title="Detalles" onEdit={() => goToStep(Step.Details)}>
              <Text variant="body">{playedAt.trim() ? `Fecha: ${playedAt}` : 'Sin fecha'}</Text>
              <Text variant="body">{notes.trim() ? `Notas: ${notes}` : 'Sin notas'}</Text>
            </SummaryBlock>

            {isEditing ? (
              <Button label="Eliminar prueba" variant="destructive" onPress={handleDelete} loading={deleting} fullWidth />
            ) : null}
          </View>
        );
    }
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xl, gap: spacing.lg }}
        showsVerticalScrollIndicator={false}
      >
        <ProgressIndicator step={currentStep} title={STEP_TITLES[currentStep]} />
        {renderStepContent()}
      </ScrollView>

      <View
        style={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.sm,
          paddingBottom: spacing.md,
          gap: spacing.sm,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          backgroundColor: colors.background,
        }}
      >
        {error ? <ErrorBanner message={error} /> : null}
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {currentStep > Step.Edition ? (
            <View style={{ flex: 1 }}>
              <Button label="Atrás" variant="outline" onPress={goBack} fullWidth />
            </View>
          ) : null}
          <View style={{ flex: 1 }}>
            {currentStep < LAST_STEP ? (
              <Button label="Siguiente" onPress={goNext} fullWidth />
            ) : (
              <Button
                label={isEditing ? 'Guardar cambios' : 'Guardar prueba'}
                onPress={handleSave}
                loading={saving}
                fullWidth
              />
            )}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

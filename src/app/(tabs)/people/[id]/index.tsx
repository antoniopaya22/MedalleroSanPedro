import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Badge, Button, Card, Divider, EmptyState, ErrorBanner, HeroHeader, IconButton, LoadingState, MedalTally, Screen, Segmented, Text } from '@/components/ui';
import { PersonActivityBreakdownList } from '@/components/people/PersonActivityBreakdownList';
import { PersonEditionBarChart } from '@/components/people/PersonEditionBarChart';
import { useAuth } from '@/context/AuthContext';
import { type PersonHistoryEntry, listPersonHistory } from '@/services/activityResults';
import { listPeople } from '@/services/people';
import { type HistoricRankingRow, buildPersonActivityBreakdown, buildPersonEditionBreakdown, listPersonSummary } from '@/services/rankings';
import { useTheme } from '@/theme';
import type { Medal, Person } from '@/types/domain';

function formatAverage(value: number): string {
  return value.toFixed(2);
}

const MEDAL_LABEL: Record<Medal, string> = {
  gold: 'Oro',
  silver: 'Plata',
  bronze: 'Bronce',
};

const MEDAL_COLOR: Record<Medal, 'medalGold' | 'medalSilver' | 'medalBronze'> = {
  gold: 'medalGold',
  silver: 'medalSilver',
  bronze: 'medalBronze',
};

type DetailTab = 'summary' | 'history' | 'activities';

const DETAIL_TABS: { key: DetailTab; label: string }[] = [
  { key: 'summary', label: 'Resumen' },
  { key: 'history', label: 'Histórico' },
  { key: 'activities', label: 'Actividades' },
];

/**
 * Vista de detalle pública de un participante (f-017, R1/R2): cabecera +
 * resumen de medallas agregando todas las ediciones (`listPersonSummary`,
 * reutiliza `listHistoricRanking`/`buildRanking` sin agregación nueva, R1.4)
 * + histórico de pruebas (`listPersonHistory`). Visible sin sesión (R2.1). El
 * FAB de alta de resultado y el acceso a "Editar persona" solo se muestran
 * con `canWrite` (R3/R4); es gating de UI, la garantía real la da RLS.
 */
export default function PersonDetailScreen() {
  const { colors, radius, spacing, shadows } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { canWrite } = useAuth();

  const [person, setPerson] = useState<Person | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [summary, setSummary] = useState<HistoricRankingRow | null>(null);
  const [history, setHistory] = useState<PersonHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Divide el contenido en pestañas (resumen/histórico/actividades) para
  // evitar un scroll único larguísimo en personas con mucho historial.
  const [activeTab, setActiveTab] = useState<DetailTab>('summary');

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [people, summaryRow, historyEntries] = await Promise.all([
        listPeople(),
        listPersonSummary(id),
        listPersonHistory(id),
      ]);
      const found = people.find((candidate) => candidate.id === id) ?? null;
      setPerson(found);
      setNotFound(!found);
      setSummary(summaryRow);
      setHistory(historyEntries);
    } catch {
      setError('No se ha podido cargar la persona. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Recarga al enfocar la pantalla (R2.2), para reflejar altas de resultado
  // hechas desde el FAB (`/results/new`) al volver.
  useFocusEffect(
    useCallback(() => {
      loadDetail();
    }, [loadDetail])
  );

  // Agregación pura sobre el histórico ya cargado (f-018, R4.2): sin
  // consultas nuevas a Supabase. Antes de los `return` condicionales de
  // abajo para no violar las reglas de hooks (nº de hooks estable entre
  // renders).
  const editionBreakdown = useMemo(() => buildPersonEditionBreakdown(history), [history]);
  const activityBreakdown = useMemo(() => buildPersonActivityBreakdown(history), [history]);

  if (loading) {
    return (
      <Screen edges={['left', 'right']}>
        <HeroHeader variant="compact" showBack eyebrow="PARTICIPANTE" title="Cargando…" />
        <LoadingState />
      </Screen>
    );
  }

  if (notFound) {
    return (
      <Screen edges={['left', 'right']}>
        <HeroHeader variant="compact" showBack eyebrow="PARTICIPANTE" title="No encontrada" />
        <Text variant="body" color="danger">
          No se ha encontrado esa persona.
        </Text>
      </Screen>
    );
  }

  // Resumen en ceros cuando la persona no ha participado en ninguna prueba
  // todavía (R5.1): `summary` es `null` porque `buildRanking` filtra las
  // filas totalmente en cero.
  const gold = summary?.gold ?? 0;
  const silver = summary?.silver ?? 0;
  const bronze = summary?.bronze ?? 0;
  const total = summary?.total ?? 0;
  const participations = summary?.participations ?? 0;
  const scorePerParticipation = summary?.scorePerParticipation ?? 0;

  const showFab = canWrite && !!person?.active;

  return (
    <View style={{ flex: 1 }}>
      <Screen scroll edges={['left', 'right']}>
        <HeroHeader
          variant="compact"
          showBack
          eyebrow="PARTICIPANTE"
          title={person?.name ?? ''}
          right={person && !person.active ? <Badge label="Inactiva" variant="neutral" /> : undefined}
        />
        <View style={{ gap: spacing.lg }}>
          {canWrite ? (
            <Button
              label="Editar persona"
              variant="outline"
              onPress={() => router.push({ pathname: '/people/[id]/edit', params: { id } })}
            />
          ) : null}

          {error ? <ErrorBanner message={error} onRetry={loadDetail} /> : null}

          <Segmented options={DETAIL_TABS} value={activeTab} onChange={setActiveTab} fullWidth />

          {activeTab === 'summary' ? (
            <View style={{ gap: spacing.lg }}>
              <View style={{ gap: spacing.sm }}>
                <Text variant="title">Resumen de medallas</Text>
                <Card>
                  <View style={{ padding: spacing.md, gap: spacing.sm }}>
                    <MedalTally gold={gold} silver={silver} bronze={bronze} />
                    <Text variant="title">{total} medallas</Text>
                    <Text variant="caption" color="textSecondary">
                      {participations} participaciones · {formatAverage(scorePerParticipation)} puntos/participación
                    </Text>
                  </View>
                </Card>
              </View>

              {history.length > 0 ? (
                <View style={{ gap: spacing.sm }}>
                  <Text variant="title">Rendimiento por edición</Text>
                  <PersonEditionBarChart rows={editionBreakdown} />
                </View>
              ) : null}
            </View>
          ) : null}

          {activeTab === 'history' ? (
            <View style={{ gap: spacing.sm }}>
              {history.length === 0 ? (
                <EmptyState
                  icon="time-outline"
                  title="Sin pruebas registradas"
                  description="Cuando esta persona participe en una prueba, aparecerá aquí."
                />
              ) : (
                <Card>
                  {history.map((entry, index) => (
                    <View key={entry.resultId}>
                      {index > 0 ? <Divider /> : null}
                      <View style={{ gap: spacing.xxs, paddingVertical: spacing.sm }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Text variant="title">
                            {entry.editionYear}
                            {entry.editionLabel ? ` · ${entry.editionLabel}` : ''}
                          </Text>
                          {canWrite ? (
                            <IconButton
                              name="pencil-outline"
                              accessibilityLabel={`Editar prueba de ${entry.activityName}`}
                              onPress={() => router.push({ pathname: '/results/new', params: { resultId: entry.resultId } })}
                            />
                          ) : null}
                        </View>
                        <Text variant="bodySmall" color="textSecondary">
                          {entry.activityName}
                        </Text>
                        {entry.medal ? (
                          <Text variant="bodySmall" color={MEDAL_COLOR[entry.medal]}>
                            {MEDAL_LABEL[entry.medal]}
                          </Text>
                        ) : (
                          <Text variant="bodySmall" color="textSecondary">
                            Participó sin medalla
                          </Text>
                        )}
                      </View>
                    </View>
                  ))}
                </Card>
              )}
            </View>
          ) : null}

          {activeTab === 'activities' ? (
            <View style={{ gap: spacing.sm }}>
              {activityBreakdown.length === 0 ? (
                <EmptyState
                  icon="podium-outline"
                  title="Sin actividades"
                  description="Cuando esta persona participe en una prueba, aparecerán aquí sus actividades."
                />
              ) : (
                <PersonActivityBreakdownList rows={activityBreakdown} />
              )}
            </View>
          ) : null}
        </View>
      </Screen>

      {showFab ? (
        <Pressable
          onPress={() => router.push({ pathname: '/results/new', params: { participantId: id } })}
          accessibilityRole="button"
          accessibilityLabel="Registrar resultado"
          style={({ pressed }) => [
            {
              position: 'absolute',
              right: spacing.lg,
              bottom: spacing.lg,
              width: 56,
              height: 56,
              borderRadius: radius.pill,
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              opacity: pressed ? 0.85 : 1,
            },
            shadows.md,
          ]}
        >
          <LinearGradient
            colors={[colors.gradientFrom, colors.gradientTo]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          />
          <Ionicons name="add" size={30} color="#FFFFFF" />
        </Pressable>
      ) : null}
    </View>
  );
}

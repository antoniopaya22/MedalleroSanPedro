import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { EditionRankingList } from '@/components/rankings/EditionRankingList';
import { Button, Card, Divider, EmptyState, ErrorBanner, HeroHeader, IconButton, LoadingState, Screen, Segmented, Text } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { type EditionHistoryEntry, listEditionHistory } from '@/services/activityResults';
import { listEditions } from '@/services/editions';
import { type EditionRankingRow, type RankingSortMode, listEditionRanking, sortRanking } from '@/services/rankings';
import { useTheme } from '@/theme';
import type { Edition, Medal } from '@/types/domain';

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

type EditionTab = 'ranking' | 'activities';

const EDITION_TABS: { key: EditionTab; label: string }[] = [
  { key: 'ranking', label: 'Clasificación' },
  { key: 'activities', label: 'Actividades' },
];

// Segmented control compacto (no otra fila de Button como las pestañas de
// arriba): mismo par de opciones que antes, pero con una apariencia distinta
// a propósito para no confundir al usuario con la navegación de pestañas
// (feedback de usuario tras f-020).
const SORT_OPTIONS: { mode: RankingSortMode; label: string }[] = [
  { mode: 'medals', label: 'Por puntos' },
  { mode: 'average', label: 'Por promedio' },
];

/**
 * Vista de detalle pública de una edición (f-016/f-020, R1/R2/R3): cabecera +
 * dos pestañas internas — Clasificación (reutiliza `listEditionRanking`/
 * `EditionRankingList`, f-005, con toggle de orden vía `sortRanking`) e
 * Actividades (histórico de pruebas de la edición vía `listEditionHistory`,
 * f-020). Visible sin sesión (R5.1). El FAB de alta de resultado y el acceso
 * a "Editar edición" quedan fuera de las pestañas y solo se muestran con
 * `canWrite` (R4); es gating de UI, la garantía real la da RLS.
 */
export default function EditionDetailScreen() {
  const { colors, radius, spacing, shadows } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { canWrite } = useAuth();

  const [edition, setEdition] = useState<Edition | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [ranking, setRanking] = useState<EditionRankingRow[]>([]);
  const [history, setHistory] = useState<EditionHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Divide el contenido en pestañas (clasificación/actividades) con el mismo
  // patrón `activeTab` que `people/[id]/index.tsx` (addendum de f-018).
  const [activeTab, setActiveTab] = useState<EditionTab>('ranking');
  const [sortMode, setSortMode] = useState<RankingSortMode>('medals');

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [editions, rows, historyEntries] = await Promise.all([
        listEditions(),
        listEditionRanking(id),
        listEditionHistory(id),
      ]);
      const found = editions.find((candidate) => candidate.id === id) ?? null;
      setEdition(found);
      setNotFound(!found);
      setRanking(rows);
      setHistory(historyEntries);
    } catch {
      setError('No se ha podido cargar la edición. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Recarga al enfocar la pantalla (R5.2), para reflejar altas de resultado
  // hechas desde el FAB (`/results/new`) al volver.
  useFocusEffect(
    useCallback(() => {
      loadDetail();
    }, [loadDetail])
  );

  // Reordena la misma lista en cliente (R2.3): nunca vuelve a consultar el
  // backend al alternar el criterio de orden. Antes de los `return`
  // condicionales de abajo para no violar las reglas de hooks.
  const sortedRanking = useMemo(() => sortRanking(ranking, sortMode), [ranking, sortMode]);

  if (loading) {
    return (
      <Screen edges={['left', 'right']}>
        <HeroHeader variant="compact" showBack eyebrow="EDICIÓN" title="Cargando…" />
        <LoadingState />
      </Screen>
    );
  }

  if (notFound) {
    return (
      <Screen edges={['left', 'right']}>
        <HeroHeader variant="compact" showBack eyebrow="EDICIÓN" title="No encontrada" />
        <Text variant="body" color="danger">
          No se ha encontrado esa edición.
        </Text>
      </Screen>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <Screen scroll edges={['left', 'right']}>
        <HeroHeader
          variant="compact"
          showBack
          eyebrow="EDICIÓN"
          title={edition ? String(edition.year) : ''}
          subtitle={edition?.label ?? undefined}
        />
        <View style={{ gap: spacing.lg }}>
          {canWrite ? (
            <Button
              label="Editar edición"
              variant="outline"
              onPress={() => router.push({ pathname: '/editions/[id]/edit', params: { id } })}
            />
          ) : null}

          {error ? <ErrorBanner message={error} onRetry={loadDetail} /> : null}

          <Segmented options={EDITION_TABS} value={activeTab} onChange={setActiveTab} fullWidth />

          {activeTab === 'ranking' ? (
            <View style={{ gap: spacing.sm }}>
              {ranking.length === 0 ? (
                <EmptyState
                  icon="podium-outline"
                  title="Todavía sin resultados"
                  description="Cuando se registre una prueba en esta edición, aparecerán aquí los participantes y su clasificación."
                />
              ) : (
                <>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                    <Text variant="caption" color="textSecondary">
                      Ordenar por
                    </Text>
                    <Segmented
                      options={SORT_OPTIONS.map((option) => ({ key: option.mode, label: option.label }))}
                      value={sortMode}
                      onChange={setSortMode}
                      variant="compact"
                    />
                  </View>
                  <EditionRankingList ranking={sortedRanking} />
                </>
              )}
            </View>
          ) : null}

          {activeTab === 'activities' ? (
            <View style={{ gap: spacing.sm }}>
              {history.length === 0 ? (
                <EmptyState
                  icon="time-outline"
                  title="Sin pruebas registradas"
                  description="Cuando se registre una prueba en esta edición, aparecerá aquí."
                />
              ) : (
                <Card>
                  {history.map((entry, index) => (
                    <View key={entry.resultId}>
                      {index > 0 ? <Divider /> : null}
                      <View style={{ gap: spacing.xxs, paddingVertical: spacing.sm }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Text variant="title">{entry.activityName}</Text>
                          {canWrite ? (
                            <IconButton
                              name="pencil-outline"
                              accessibilityLabel={`Editar prueba de ${entry.activityName}`}
                              onPress={() => router.push({ pathname: '/results/new', params: { resultId: entry.resultId } })}
                            />
                          ) : null}
                        </View>
                        <Text variant="bodySmall" color="textSecondary">
                          {entry.participantCount} participantes
                        </Text>
                        <View style={{ gap: spacing.xxs }}>
                          {entry.medals.map((medal) => (
                            <Text key={medal.medal} variant="bodySmall">
                              <Text variant="bodySmall" color={MEDAL_COLOR[medal.medal]}>
                                {MEDAL_LABEL[medal.medal]}
                              </Text>
                              {': '}
                              {medal.personNames.join(', ')}
                            </Text>
                          ))}
                        </View>
                      </View>
                    </View>
                  ))}
                </Card>
              )}
            </View>
          ) : null}
        </View>
      </Screen>

      {canWrite ? (
        <Pressable
          onPress={() => router.push({ pathname: '/results/new', params: { editionId: id } })}
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

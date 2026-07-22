import type { Medal } from '@/types/domain';
import type { PersonHistoryEntry } from './activityResults';
import { listEditions } from './editions';
import { supabase } from './supabase';

interface PersonRow {
  id: string;
  name: string;
}

interface ActivityResultRankingRow {
  id: string;
  participant_ids: string[];
  edition_id: string;
}

interface MedalAwardRankingRow {
  result_id: string;
  medal: Medal;
  person_ids: string[];
}

/** Valor en puntos de cada medalla, usado para las clasificaciones (oro > plata > bronce). */
export const MEDAL_VALUES: Record<Medal, number> = { gold: 3, silver: 2, bronze: 1 };

export interface RankingRow {
  personId: string;
  personName: string;
  gold: number;
  silver: number;
  bronze: number;
  total: number;
  score: number;
  participations: number;
  scorePerParticipation: number;
}

/** Alias para el ranking de una edición (f-005). */
export type EditionRankingRow = RankingRow;

/** Alias para el ranking histórico agregando todas las ediciones (f-006). */
export type HistoricRankingRow = RankingRow;

/** Alias para el ranking agregado de una actividad concreta (f-007). */
export type ActivityRankingRow = RankingRow;

export type RankingSortMode = 'medals' | 'average';

function emptyRow(person: PersonRow): RankingRow {
  return {
    personId: person.id,
    personName: person.name,
    gold: 0,
    silver: 0,
    bronze: 0,
    total: 0,
    score: 0,
    participations: 0,
    scorePerParticipation: 0,
  };
}

/** Orden por defecto: puntos (oro 3 / plata 2 / bronce 1), luego oro, plata, bronce, total, nombre. */
function compareByMedals(a: RankingRow, b: RankingRow): number {
  return (
    b.score - a.score ||
    b.gold - a.gold ||
    b.silver - a.silver ||
    b.bronze - a.bronze ||
    b.total - a.total ||
    a.personName.localeCompare(b.personName)
  );
}

/** Orden por eficiencia: puntos por participación, luego puntos totales, oro, plata, bronce, nombre. */
function compareByAverage(a: RankingRow, b: RankingRow): number {
  return (
    b.scorePerParticipation - a.scorePerParticipation ||
    b.score - a.score ||
    b.gold - a.gold ||
    b.silver - a.silver ||
    b.bronze - a.bronze ||
    a.personName.localeCompare(b.personName)
  );
}

/**
 * Reordena en cliente (sin re-consultar el backend, R3.1/R3.6) el mismo
 * ranking (histórico o de una actividad concreta) según el criterio elegido:
 * "por medallas" (defecto del servicio) o "por promedio" (eficiencia).
 */
export function sortRanking(rows: RankingRow[], mode: RankingSortMode): RankingRow[] {
  const comparator = mode === 'average' ? compareByAverage : compareByMedals;
  return [...rows].sort(comparator);
}

/** Alias histórico (f-006): mantenido para no tocar `rankings/historic.tsx` ni sus tests. */
export const sortHistoricRanking = sortRanking;

/**
 * Agregación común de ranking (participaciones desde `participant_ids`,
 * medallas desde `person_ids`, promedio `total / participations`),
 * reutilizada por `listEditionRanking` y `listHistoricRanking` para no
 * duplicar lógica entre el ranking de una edición y el histórico agregado.
 */
function buildRanking(
  people: PersonRow[],
  results: ActivityResultRankingRow[],
  awards: MedalAwardRankingRow[]
): RankingRow[] {
  const rowsByPerson = new Map(people.map((person) => [person.id, emptyRow(person)]));

  for (const result of results) {
    for (const personId of new Set(result.participant_ids)) {
      const row = rowsByPerson.get(personId);
      if (row) {
        row.participations += 1;
      }
    }
  }

  for (const award of awards) {
    for (const personId of new Set(award.person_ids)) {
      const row = rowsByPerson.get(personId);
      if (!row) {
        continue;
      }

      row[award.medal] += 1;
      row.total += 1;
      row.score += MEDAL_VALUES[award.medal];
    }
  }

  return Array.from(rowsByPerson.values())
    .filter((row) => row.participations > 0 || row.total > 0)
    .map((row) => ({
      ...row,
      scorePerParticipation: row.participations === 0 ? 0 : row.score / row.participations,
    }))
    .sort(compareByMedals);
}

/** Tope de filas por página que PostgREST aplica siempre (`db-max-rows`), incluso si se pide un `.range` mayor. */
const PAGE_SIZE = 1000;

/**
 * Pagina cualquier consulta de Supabase por encima de `PAGE_SIZE`: sin este
 * bucle, tablas que superan esa cota (p.ej. `medal_awards`, con miles de
 * filas históricas) pierden datos en silencio a partir de la fila 1000 y el
 * ranking sale mal — no como error, sino con menos medallas de las reales.
 */
async function fetchAllRows<T>(page: (from: number, to: number) => PromiseLike<{ data: unknown; error: unknown }>): Promise<T[]> {
  const rows: T[] = [];
  let from = 0;

  for (;;) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1);
    if (error) {
      throw error;
    }

    const batch = (data ?? []) as T[];
    rows.push(...batch);

    if (batch.length < PAGE_SIZE) {
      return rows;
    }
    from += PAGE_SIZE;
  }
}

async function fetchPeople(): Promise<PersonRow[]> {
  return fetchAllRows<PersonRow>((from, to) => supabase.from('people').select('id,name').order('name').range(from, to));
}

async function fetchActivityResults(filterColumn?: 'edition_id' | 'activity_id', filterValue?: string): Promise<ActivityResultRankingRow[]> {
  return fetchAllRows<ActivityResultRankingRow>((from, to) => {
    const query = supabase.from('activity_results').select('id,participant_ids,edition_id');
    const filtered = filterColumn && filterValue !== undefined ? query.eq(filterColumn, filterValue) : query;
    return filtered.range(from, to);
  });
}

async function fetchAwardsForResults(resultIds: string[]): Promise<MedalAwardRankingRow[]> {
  if (resultIds.length === 0) {
    return [];
  }

  return fetchAllRows<MedalAwardRankingRow>((from, to) =>
    supabase.from('medal_awards').select('result_id,medal,person_ids').in('result_id', resultIds).range(from, to)
  );
}

/**
 * Trae todos los `medal_awards` sin filtrar por `result_id`, para el ranking
 * histórico: filtrar por los ids de todos los `activity_results` (que ya son
 * todos) es redundante y con cientos de pruebas genera una URL `in(...)`
 * demasiado larga que Supabase rechaza con 400 Bad Request.
 */
async function fetchAllAwards(): Promise<MedalAwardRankingRow[]> {
  return fetchAllRows<MedalAwardRankingRow>((from, to) =>
    supabase.from('medal_awards').select('result_id,medal,person_ids').range(from, to)
  );
}

export async function listEditionRanking(editionId: string): Promise<EditionRankingRow[]> {
  const people = await fetchPeople();
  const results = await fetchActivityResults('edition_id', editionId);
  const awards = await fetchAwardsForResults(results.map((result) => result.id));

  return buildRanking(people, results, awards);
}

/** Acota `listHistoricRanking` a las ediciones cuyo año cae en `[fromYear, toYear]` (f-021, R1). */
export interface YearRange {
  fromYear?: number;
  toYear?: number;
}

/**
 * Ranking histórico agregando `activity_results`/`medal_awards` de **todas**
 * las ediciones (sin filtro `edition_id`), equivalente a la hoja RESULTADOS
 * del xlsx histórico. Se devuelve ya ordenado "por medallas"; el reordenado
 * "por promedio" se hace en cliente con `sortHistoricRanking`.
 *
 * Con `yearRange` (f-021, R1.3), acota la agregación a las ediciones cuyo año
 * cae en rango: se resuelven los `edition_id` de esas ediciones vía
 * `listEditions()` y se filtran en cliente tanto `results` como `awards` (por
 * el mismo `resultIdSet`) antes de agregarlos — filtrar solo uno de los dos
 * contaría medallas de pruebas fuera de rango, ya que `buildRanking` agrega
 * ciegamente lo que se le pase.
 */
export async function listHistoricRanking(yearRange?: YearRange): Promise<HistoricRankingRow[]> {
  const [people, allResults, allAwards] = await Promise.all([fetchPeople(), fetchActivityResults(), fetchAllAwards()]);

  let results = allResults;
  let awards = allAwards;

  if (yearRange && (yearRange.fromYear !== undefined || yearRange.toYear !== undefined)) {
    const editions = await listEditions();
    const editionIdsInRange = new Set(
      editions
        .filter(
          (edition) =>
            (yearRange.fromYear === undefined || edition.year >= yearRange.fromYear) &&
            (yearRange.toYear === undefined || edition.year <= yearRange.toYear)
        )
        .map((edition) => edition.id)
    );

    results = allResults.filter((result) => editionIdsInRange.has(result.edition_id));
    const resultIdSet = new Set(results.map((result) => result.id));
    awards = allAwards.filter((award) => resultIdSet.has(award.result_id));
  }

  return buildRanking(people, results, awards);
}

/**
 * Ranking agregado de una `Activity` concreta a través de **todas** las
 * ediciones en las que se jugó (filtra `activity_results` por `activity_id`
 * en vez de por `edition_id`, R3.1), paralelo exacto de `listEditionRanking`.
 * Se devuelve ya ordenado "por medallas"; el reordenado "por promedio" se
 * hace en cliente con `sortRanking` (R3.6).
 */
export async function listActivityRanking(activityId: string): Promise<ActivityRankingRow[]> {
  const people = await fetchPeople();
  const results = await fetchActivityResults('activity_id', activityId);
  const awards = await fetchAwardsForResults(results.map((result) => result.id));

  return buildRanking(people, results, awards);
}

/**
 * Resumen de medallas de UNA persona agregando todas las ediciones (f-017,
 * R1.3/R1.4): reutiliza `listHistoricRanking`/`buildRanking` sin duplicar la
 * agregación de oro/plata/bronce/promedio, y filtra su fila por `personId`.
 * Devuelve `null` cuando la persona no ha participado en ninguna prueba
 * (`buildRanking` filtra las filas totalmente en cero, R5.1: el detalle lo
 * interpreta como "resumen en ceros").
 */
export async function listPersonSummary(personId: string): Promise<HistoricRankingRow | null> {
  const rows = await listHistoricRanking();
  return rows.find((row) => row.personId === personId) ?? null;
}

export interface PersonEditionBreakdownRow {
  editionId: string;
  editionYear: number;
  editionLabel: string | null;
  score: number;
  participations: number;
  scorePerParticipation: number;
}

export interface PersonActivityBreakdownRow {
  activityId: string;
  activityName: string;
  score: number;
  participations: number;
  scorePerParticipation: number;
}

/**
 * Puntos y promedio de UNA persona agrupados por edición (f-018, R1/R2):
 * agregación pura sobre el `PersonHistoryEntry[]` que ya trae `listPersonHistory`
 * (f-017), sin ninguna consulta nueva a Supabase (R4.2). Ordenado de edición
 * más antigua a más reciente (R1.2, se lee como progresión temporal, al
 * contrario que los rankings que van de más a menos reciente).
 */
export function buildPersonEditionBreakdown(history: PersonHistoryEntry[]): PersonEditionBreakdownRow[] {
  const rowsByEdition = new Map<string, PersonEditionBreakdownRow>();

  for (const entry of history) {
    let row = rowsByEdition.get(entry.editionId);
    if (!row) {
      row = {
        editionId: entry.editionId,
        editionYear: entry.editionYear,
        editionLabel: entry.editionLabel,
        score: 0,
        participations: 0,
        scorePerParticipation: 0,
      };
      rowsByEdition.set(entry.editionId, row);
    }

    row.participations += 1;
    if (entry.medal) {
      row.score += MEDAL_VALUES[entry.medal];
    }
  }

  return Array.from(rowsByEdition.values())
    .map((row) => ({ ...row, scorePerParticipation: row.score / row.participations }))
    .sort((a, b) => a.editionYear - b.editionYear);
}

/**
 * Puntos y promedio de UNA persona agrupados por actividad (f-018, R3),
 * ordenado de mayor a menor promedio propio (R3.2): misma agregación pura
 * sobre `PersonHistoryEntry[]` que `buildPersonEditionBreakdown`, sin
 * consultas nuevas (R4.2).
 */
export function buildPersonActivityBreakdown(history: PersonHistoryEntry[]): PersonActivityBreakdownRow[] {
  const rowsByActivity = new Map<string, PersonActivityBreakdownRow>();

  for (const entry of history) {
    let row = rowsByActivity.get(entry.activityId);
    if (!row) {
      row = {
        activityId: entry.activityId,
        activityName: entry.activityName,
        score: 0,
        participations: 0,
        scorePerParticipation: 0,
      };
      rowsByActivity.set(entry.activityId, row);
    }

    row.participations += 1;
    if (entry.medal) {
      row.score += MEDAL_VALUES[entry.medal];
    }
  }

  return Array.from(rowsByActivity.values())
    .map((row) => ({ ...row, scorePerParticipation: row.score / row.participations }))
    .sort(
      (a, b) =>
        b.scorePerParticipation - a.scorePerParticipation || b.score - a.score || a.activityName.localeCompare(b.activityName)
    );
}

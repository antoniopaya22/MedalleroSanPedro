import type { ActivityResult, Medal } from '@/types/domain';
import { listActivities } from './activities';
import { listEditions } from './editions';
import { supabase } from './supabase';

interface ActivityResultRow {
  id: string;
  edition_id: string;
  activity_id: string;
  participant_ids: string[];
  played_at: string | null;
  notes: string | null;
  created_by_user_id: string | null;
  created_at: string;
}

export interface MedalAwardInput {
  medal: Medal;
  personIds: string[];
}

export interface CreateActivityResultInput {
  editionId: string;
  activityId: string;
  participantIds: string[];
  playedAt?: string | null;
  notes?: string | null;
  medalAwards: MedalAwardInput[];
}

function mapRow(row: ActivityResultRow): ActivityResult {
  return {
    id: row.id,
    editionId: row.edition_id,
    activityId: row.activity_id,
    participantIds: row.participant_ids,
    playedAt: row.played_at,
    notes: row.notes,
    createdByUserId: row.created_by_user_id,
    createdAt: row.created_at,
  };
}

export class ActivityResultValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ActivityResultValidationError';
  }
}

function unique(ids: string[]): string[] {
  return Array.from(new Set(ids));
}

function validateAndNormalize(input: CreateActivityResultInput): CreateActivityResultInput {
  if (!input.editionId) {
    throw new ActivityResultValidationError('Elige una edicion.');
  }
  if (!input.activityId) {
    throw new ActivityResultValidationError('Elige una actividad.');
  }

  const participantIds = unique(input.participantIds.filter(Boolean));
  if (participantIds.length === 0) {
    throw new ActivityResultValidationError('Selecciona al menos un participante.');
  }

  const seenMedals = new Set<Medal>();
  const seenWinners = new Set<string>();
  const medalAwards = input.medalAwards
    .map((award) => ({ medal: award.medal, personIds: unique(award.personIds.filter(Boolean)) }))
    .filter((award) => award.personIds.length > 0);

  if (medalAwards.length === 0) {
    throw new ActivityResultValidationError('Asigna al menos una medalla.');
  }

  for (const award of medalAwards) {
    if (seenMedals.has(award.medal)) {
      throw new ActivityResultValidationError('No puede haber dos medallas del mismo color en una prueba.');
    }
    seenMedals.add(award.medal);

    for (const personId of award.personIds) {
      if (seenWinners.has(personId)) {
        throw new ActivityResultValidationError('Una persona no puede recibir dos medallas en la misma prueba.');
      }
      seenWinners.add(personId);
      if (!participantIds.includes(personId)) {
        participantIds.push(personId);
      }
    }
  }

  return {
    ...input,
    participantIds,
    playedAt: input.playedAt?.trim() ? input.playedAt.trim() : null,
    notes: input.notes?.trim() ? input.notes.trim() : null,
    medalAwards,
  };
}

export async function createActivityResult(input: CreateActivityResultInput): Promise<ActivityResult> {
  const normalized = validateAndNormalize(input);

  const { data, error } = await supabase.rpc('create_activity_result_with_awards', {
    p_edition_id: normalized.editionId,
    p_activity_id: normalized.activityId,
    p_participant_ids: normalized.participantIds,
    p_played_at: normalized.playedAt,
    p_notes: normalized.notes,
    p_medal_awards: normalized.medalAwards.map((award) => ({
      medal: award.medal,
      personIds: award.personIds,
    })),
  });

  if (error) {
    throw error;
  }

  return mapRow(data as ActivityResultRow);
}

/**
 * Corrige un `ActivityResult` ya registrado (plan de mejoras, fase 1): mismas
 * validaciones que `createActivityResult`, vía la RPC atómica
 * `update_activity_result_with_awards` (sustituye por completo los
 * `medal_awards` de la prueba).
 */
export async function updateActivityResult(
  resultId: string,
  input: CreateActivityResultInput
): Promise<ActivityResult> {
  const normalized = validateAndNormalize(input);

  const { data, error } = await supabase.rpc('update_activity_result_with_awards', {
    p_result_id: resultId,
    p_edition_id: normalized.editionId,
    p_activity_id: normalized.activityId,
    p_participant_ids: normalized.participantIds,
    p_played_at: normalized.playedAt,
    p_notes: normalized.notes,
    p_medal_awards: normalized.medalAwards.map((award) => ({
      medal: award.medal,
      personIds: award.personIds,
    })),
  });

  if (error) {
    throw error;
  }

  return mapRow(data as ActivityResultRow);
}

/**
 * Borra un `ActivityResult` ya registrado (plan de mejoras, fase 1): `delete`
 * simple, cubierto por la política `activity_results_write_claimed_person`
 * (`for all`) sin necesidad de RPC. `medal_awards` se borra en cascada
 * (`on delete cascade`, ver `20260719120000_init_schema.sql`).
 */
export async function deleteActivityResult(resultId: string): Promise<void> {
  const { error } = await supabase.from('activity_results').delete().eq('id', resultId);

  if (error) {
    throw error;
  }
}

interface ActivityResultDetailAwardRow {
  medal: Medal;
  person_ids: string[];
}

export interface ActivityResultDetail {
  editionId: string;
  activityId: string;
  participantIds: string[];
  playedAt: string | null;
  notes: string | null;
  medalAwards: MedalAwardInput[];
}

/**
 * Detalle completo de UN `ActivityResult` (plan de mejoras, fase 1): para
 * precargar el asistente de `results/new.tsx` en modo edición. Distinto de
 * `listEditionHistory`/`listPersonHistory`/`listActivityHistory` (que
 * resuelven nombres para mostrar en pantalla): aquí se devuelven los ids tal
 * cual, que es lo que el asistente necesita para su propio estado.
 */
export async function getActivityResultDetail(resultId: string): Promise<ActivityResultDetail> {
  const [resultResponse, awardsResponse] = await Promise.all([
    supabase.from('activity_results').select('*').eq('id', resultId).single(),
    supabase.from('medal_awards').select('medal,person_ids').eq('result_id', resultId),
  ]);

  if (resultResponse.error) {
    throw resultResponse.error;
  }
  if (awardsResponse.error) {
    throw awardsResponse.error;
  }

  const row = resultResponse.data as ActivityResultRow;
  const awards = awardsResponse.data as ActivityResultDetailAwardRow[];

  return {
    editionId: row.edition_id,
    activityId: row.activity_id,
    participantIds: row.participant_ids,
    playedAt: row.played_at,
    notes: row.notes,
    medalAwards: awards.map((award) => ({ medal: award.medal, personIds: award.person_ids })),
  };
}

interface ActivityHistoryResultRow {
  id: string;
  edition_id: string;
  participant_ids: string[];
  played_at: string | null;
}

interface ActivityHistoryAwardRow {
  result_id: string;
  medal: Medal;
  person_ids: string[];
}

interface ActivityHistoryPersonRow {
  id: string;
  name: string;
}

export interface ActivityHistoryMedal {
  medal: Medal;
  personNames: string[];
}

/** Una prueba (`ActivityResult`) de la actividad, con su edición y medallas resueltas (R2). */
export interface ActivityHistoryEntry {
  resultId: string;
  editionId: string;
  editionYear: number;
  editionLabel: string | null;
  playedAt: string | null;
  participantCount: number;
  medals: ActivityHistoryMedal[];
}

/** Orden fijo de presentación de medallas dentro de cada prueba (R2.2). */
const MEDAL_DISPLAY_ORDER: Medal[] = ['gold', 'silver', 'bronze'];

/**
 * Histórico de pruebas de una `Activity` a través de **todas** las ediciones
 * en las que se jugó (R2.1), con la edición, el nº de participantes (R2.3) y
 * las medallas otorgadas con los nombres de sus ganadores (R2.2). No consulta
 * `medal_awards`/`people`/`editions` si la actividad no tiene ninguna prueba
 * (R2.5). Ordenado de la edición más reciente a la más antigua y, dentro del
 * mismo año, de la prueba más reciente (`played_at`) a la más antigua, con los
 * `played_at` nulos al final (R2.4).
 */
export async function listActivityHistory(activityId: string): Promise<ActivityHistoryEntry[]> {
  const { data: resultsData, error: resultsError } = await supabase
    .from('activity_results')
    .select('id,edition_id,participant_ids,played_at')
    .eq('activity_id', activityId);

  if (resultsError) {
    throw resultsError;
  }

  const results = resultsData as ActivityHistoryResultRow[];

  if (results.length === 0) {
    return [];
  }

  const [editions, awardsResponse, peopleResponse] = await Promise.all([
    listEditions(),
    supabase.from('medal_awards').select('result_id,medal,person_ids').in(
      'result_id',
      results.map((result) => result.id)
    ),
    supabase.from('people').select('id,name'),
  ]);

  if (awardsResponse.error) {
    throw awardsResponse.error;
  }
  if (peopleResponse.error) {
    throw peopleResponse.error;
  }

  const awards = awardsResponse.data as ActivityHistoryAwardRow[];
  const people = peopleResponse.data as ActivityHistoryPersonRow[];

  const editionById = new Map(editions.map((edition) => [edition.id, edition]));
  const personNameById = new Map(people.map((person) => [person.id, person.name]));

  const awardsByResultId = groupAwardsByResultId(awards);

  const entries = results.map((result) => {
    const edition = editionById.get(result.edition_id);
    const resultAwards = awardsByResultId.get(result.id) ?? [];

    return {
      resultId: result.id,
      editionId: result.edition_id,
      editionYear: edition?.year ?? 0,
      editionLabel: edition?.label ?? null,
      playedAt: result.played_at,
      participantCount: result.participant_ids.length,
      medals: resolveMedals(resultAwards, personNameById),
    };
  });

  return entries.sort(compareByEditionRecency);
}

/**
 * Agrupa `medal_awards` por `result_id`, paso previo compartido por
 * `listActivityHistory` y `listEditionHistory` antes de resolver los nombres
 * de ganadores por prueba con `resolveMedals`.
 */
function groupAwardsByResultId<T extends { result_id: string }>(awards: T[]): Map<string, T[]> {
  const awardsByResultId = new Map<string, T[]>();
  for (const award of awards) {
    const forResult = awardsByResultId.get(award.result_id) ?? [];
    forResult.push(award);
    awardsByResultId.set(award.result_id, forResult);
  }
  return awardsByResultId;
}

/**
 * Resuelve las medallas de UNA prueba en el orden fijo oro/plata/bronce
 * (`MEDAL_DISPLAY_ORDER`), mapeando `person_ids` a nombres vía
 * `personNameById`. Helper privado compartido por `listActivityHistory`
 * (f-007) y `listEditionHistory` (f-020, R3.4) para no duplicar esta lógica.
 */
function resolveMedals(
  resultAwards: { medal: Medal; person_ids: string[] }[],
  personNameById: Map<string, string>
): ActivityHistoryMedal[] {
  return MEDAL_DISPLAY_ORDER.map((medal) => resultAwards.find((award) => award.medal === medal))
    .filter((award): award is { medal: Medal; person_ids: string[] } => award !== undefined)
    .map((award) => ({
      medal: award.medal,
      personNames: award.person_ids.map((personId) => personNameById.get(personId) ?? ''),
    }));
}

/**
 * Orden "más reciente primero" compartido por `listActivityHistory` (f-007) y
 * `listPersonHistory` (f-017, R1.6): edición más reciente primero y, dentro
 * del mismo año, `played_at` descendente con los nulos al final.
 */
function compareByEditionRecency<T extends { editionYear: number; playedAt: string | null }>(a: T, b: T): number {
  if (a.editionYear !== b.editionYear) {
    return b.editionYear - a.editionYear;
  }
  if (a.playedAt === b.playedAt) {
    return 0;
  }
  if (a.playedAt === null) {
    return 1;
  }
  if (b.playedAt === null) {
    return -1;
  }
  return b.playedAt.localeCompare(a.playedAt);
}

interface EditionHistoryResultRow {
  id: string;
  activity_id: string;
  participant_ids: string[];
  played_at: string | null;
}

interface EditionHistoryAwardRow {
  result_id: string;
  medal: Medal;
  person_ids: string[];
}

/** Una prueba (`ActivityResult`) jugada en UNA edición concreta, con el nombre de la actividad y las medallas resueltas (f-020, R3.1). */
export interface EditionHistoryEntry {
  resultId: string;
  activityId: string;
  activityName: string;
  playedAt: string | null;
  participantCount: number;
  medals: ActivityHistoryMedal[];
}

/**
 * Ordena por `played_at` descendente con los nulos al final (R3.3). A
 * diferencia de `compareByEditionRecency`, aquí no procede ordenar por edición
 * primero: todas las pruebas de `listEditionHistory` pertenecen a la MISMA
 * edición.
 */
function comparePlayedAtDescending(a: { playedAt: string | null }, b: { playedAt: string | null }): number {
  if (a.playedAt === b.playedAt) {
    return 0;
  }
  if (a.playedAt === null) {
    return 1;
  }
  if (b.playedAt === null) {
    return -1;
  }
  return b.playedAt.localeCompare(a.playedAt);
}

/**
 * Histórico de pruebas jugadas en UNA `Edition` concreta (f-020, R3.1),
 * paralelo a `listActivityHistory` pero centrado en la edición en vez de en
 * la actividad: filtra `activity_results` por `edition_id` y resuelve el
 * nombre de la **actividad** de cada prueba (en vez del año de la edición,
 * que ya no hace falta al tratarse de una sola edición) junto con el nº de
 * participantes y las medallas otorgadas con los nombres de sus ganadores
 * (R3.1/R3.2), reutilizando `resolveMedals`. No consulta
 * `medal_awards`/`people`/`activities` si la edición no tiene ninguna prueba
 * (R3.5). Ordenado de la prueba más reciente a la más antigua por
 * `played_at`, con los nulos al final (R3.3).
 */
export async function listEditionHistory(editionId: string): Promise<EditionHistoryEntry[]> {
  const { data: resultsData, error: resultsError } = await supabase
    .from('activity_results')
    .select('id,activity_id,participant_ids,played_at')
    .eq('edition_id', editionId);

  if (resultsError) {
    throw resultsError;
  }

  const results = resultsData as EditionHistoryResultRow[];

  if (results.length === 0) {
    return [];
  }

  const [activities, awardsResponse, peopleResponse] = await Promise.all([
    listActivities(),
    // `.in('result_id', resultIds)` es seguro aquí: son solo las pruebas de
    // UNA edición (decenas como mucho), lejos del límite de URL que motivó el
    // fix `.contains(...)` en `listPersonHistory`/rankings histórico.
    supabase.from('medal_awards').select('result_id,medal,person_ids').in(
      'result_id',
      results.map((result) => result.id)
    ),
    supabase.from('people').select('id,name'),
  ]);

  if (awardsResponse.error) {
    throw awardsResponse.error;
  }
  if (peopleResponse.error) {
    throw peopleResponse.error;
  }

  const awards = awardsResponse.data as EditionHistoryAwardRow[];
  const people = peopleResponse.data as ActivityHistoryPersonRow[];

  const activityNameById = new Map(activities.map((activity) => [activity.id, activity.name]));
  const personNameById = new Map(people.map((person) => [person.id, person.name]));
  const awardsByResultId = groupAwardsByResultId(awards);

  const entries = results.map((result) => {
    const resultAwards = awardsByResultId.get(result.id) ?? [];

    return {
      resultId: result.id,
      activityId: result.activity_id,
      activityName: activityNameById.get(result.activity_id) ?? '',
      playedAt: result.played_at,
      participantCount: result.participant_ids.length,
      medals: resolveMedals(resultAwards, personNameById),
    };
  });

  return entries.sort(comparePlayedAtDescending);
}

interface PersonHistoryResultRow {
  id: string;
  edition_id: string;
  activity_id: string;
  played_at: string | null;
}

interface PersonHistoryAwardRow {
  result_id: string;
  medal: Medal;
  person_ids: string[];
}

/** Una prueba (`ActivityResult`) en la que participó la persona, con su edición, actividad y la medalla propia (f-017, R1.5). */
export interface PersonHistoryEntry {
  resultId: string;
  editionId: string;
  editionYear: number;
  editionLabel: string | null;
  activityId: string;
  activityName: string;
  playedAt: string | null;
  /** Medalla obtenida por ESTA persona en la prueba, o `null` si participó sin medalla. */
  medal: Medal | null;
}

/**
 * Histórico de pruebas en las que participó una `Person` a través de
 * **todas** las ediciones y actividades (f-017, R1.5), paralelo a
 * `listActivityHistory` pero centrado en la persona en vez de en la
 * actividad: filtra `activity_results` por pertenencia a `participant_ids`
 * (`.contains`) y resuelve, por prueba, la medalla propia de esta persona (o
 * `null` si participó sin medalla) en vez de la lista de ganadores por color.
 * No consulta `medal_awards`/`editions`/`activities` si la persona no tiene
 * ninguna prueba (R5.1). Mismo orden reciente-primero que `listActivityHistory`
 * (R1.6).
 */
export async function listPersonHistory(personId: string): Promise<PersonHistoryEntry[]> {
  const { data: resultsData, error: resultsError } = await supabase
    .from('activity_results')
    .select('id,edition_id,activity_id,played_at')
    .contains('participant_ids', [personId]);

  if (resultsError) {
    throw resultsError;
  }

  const results = resultsData as PersonHistoryResultRow[];

  if (results.length === 0) {
    return [];
  }

  const [editions, activities, awardsResponse] = await Promise.all([
    listEditions(),
    listActivities(),
    // Filtra medal_awards por `person_ids` (medallas de ESTA persona) en vez
    // de `.in('result_id', ids)` con la lista de pruebas: para alguien con
    // cientos de participaciones, la URL `in(...)` con todos esos ids supera
    // el límite que acepta Supabase (mismo bug ya corregido en rankings.ts
    // para el ranking histórico) y la petición falla con 400 Bad Request.
    supabase.from('medal_awards').select('result_id,medal,person_ids').contains('person_ids', [personId]),
  ]);

  if (awardsResponse.error) {
    throw awardsResponse.error;
  }

  const awards = awardsResponse.data as PersonHistoryAwardRow[];

  const editionById = new Map(editions.map((edition) => [edition.id, edition]));
  const activityNameById = new Map(activities.map((activity) => [activity.id, activity.name]));

  // Por invariante de dominio (`createActivityResult`), una persona no puede
  // recibir dos medallas en la misma prueba: como mucho hay un award con
  // `personId` por `result_id`.
  const medalByResultId = new Map<string, Medal>();
  for (const award of awards) {
    if (award.person_ids.includes(personId)) {
      medalByResultId.set(award.result_id, award.medal);
    }
  }

  const entries: PersonHistoryEntry[] = results.map((result) => {
    const edition = editionById.get(result.edition_id);

    return {
      resultId: result.id,
      editionId: result.edition_id,
      editionYear: edition?.year ?? 0,
      editionLabel: edition?.label ?? null,
      activityId: result.activity_id,
      activityName: activityNameById.get(result.activity_id) ?? '',
      playedAt: result.played_at,
      medal: medalByResultId.get(result.id) ?? null,
    };
  });

  return entries.sort(compareByEditionRecency);
}


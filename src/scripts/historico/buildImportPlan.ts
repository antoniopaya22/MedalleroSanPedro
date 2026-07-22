/**
 * Construye el `ImportPlan` (R1-R6) a partir del JSON de origen. Código puro,
 * sin I/O: no habla con Supabase ni conoce uuids, sólo transforma
 * `HistoricoJson` -> `ImportPlan` y valida las invariantes de dominio que
 * replican las de la RPC `create_activity_result_with_awards` (R4.4), para
 * que `importHistorico.ts` pueda insertar directamente con confianza.
 */

import type { Medal } from '@/types/domain';
import { preferredDisplayName, resolveKey } from './normalizeActivityName';
import type {
  HistoricoActivityResult,
  HistoricoJson,
  ImportPlan,
  PlannedActivity,
  PlannedMedalAward,
  PlannedResult,
  SkippedResult,
} from './types';

const MEDAL_ORDER: Medal[] = ['gold', 'silver', 'bronze'];

function buildEditions(source: HistoricoJson): ImportPlan['editions'] {
  const seenYears = new Set<number>();
  const editions = source.editions.map((edition) => {
    if (seenYears.has(edition.year)) {
      throw new Error(`buildImportPlan: año de edición duplicado (${edition.year}).`);
    }
    seenYears.add(edition.year);
    return { jsonId: edition.id, year: edition.year };
  });
  return editions;
}

function buildPeople(source: HistoricoJson): ImportPlan['people'] {
  const seenIds = new Set<string>();
  const people = source.people.map((person) => {
    if (seenIds.has(person.id)) {
      throw new Error(`buildImportPlan: personId duplicado en el JSON de origen (${person.id}).`);
    }
    seenIds.add(person.id);
    return { jsonId: person.id, name: person.name };
  });
  return people;
}

/**
 * Traduce un `activityResult` crudo a `PlannedResult`, validando sus
 * invariantes de dominio (R4.2-R4.4): sin participantes duplicados, como
 * mucho un `MedalAward` por color, ninguna persona con dos medallas en la
 * misma prueba, y todo ganador dentro de `participantJsonIds`.
 */
function buildResult(
  editionJsonId: string,
  raw: HistoricoActivityResult,
  knownPersonIds: Set<string>
): PlannedResult {
  const participantJsonIds: string[] = [];
  const seenParticipants = new Set<string>();

  for (const participant of raw.participants) {
    if (!knownPersonIds.has(participant.personId)) {
      throw new Error(
        `buildImportPlan: activityResult "${raw.id}" referencia un personId desconocido (${participant.personId}).`
      );
    }
    if (seenParticipants.has(participant.personId)) {
      throw new Error(
        `buildImportPlan: activityResult "${raw.id}" tiene un participante duplicado (${participant.personId}).`
      );
    }
    seenParticipants.add(participant.personId);
    participantJsonIds.push(participant.personId);
  }

  const personIdsByMedal = new Map<Medal, string[]>();
  const seenWinners = new Set<string>();

  for (const participant of raw.participants) {
    if (!participant.medal) {
      continue;
    }
    if (seenWinners.has(participant.personId)) {
      throw new Error(
        `buildImportPlan: activityResult "${raw.id}" otorga más de una medalla a la misma persona (${participant.personId}).`
      );
    }
    seenWinners.add(participant.personId);

    const forMedal = personIdsByMedal.get(participant.medal) ?? [];
    forMedal.push(participant.personId);
    personIdsByMedal.set(participant.medal, forMedal);
  }

  const medalAwards: PlannedMedalAward[] = MEDAL_ORDER.filter((medal) => personIdsByMedal.has(medal)).map(
    (medal) => ({
      medal,
      personJsonIds: personIdsByMedal.get(medal) as string[],
    })
  );

  for (const award of medalAwards) {
    for (const winnerId of award.personJsonIds) {
      if (!seenParticipants.has(winnerId)) {
        throw new Error(
          `buildImportPlan: activityResult "${raw.id}" premia a "${winnerId}" que no figura en participants[].`
        );
      }
    }
  }

  return {
    jsonId: raw.id,
    editionJsonId,
    activityCanonicalKey: resolveKey(raw.activity),
    participantJsonIds,
    medalAwards,
  };
}

function buildResultsAndActivities(
  source: HistoricoJson,
  knownPersonIds: Set<string>
): { results: PlannedResult[]; skipped: SkippedResult[]; activities: PlannedActivity[] } {
  const results: PlannedResult[] = [];
  const skipped: SkippedResult[] = [];
  const rawVariantsByKey = new Map<string, string[]>();

  for (const edition of source.editions) {
    for (const raw of edition.activityResults) {
      if (raw.participants.length === 0) {
        skipped.push({ jsonId: raw.id, reason: 'sin participantes (artefacto de la hoja de origen)' });
        continue;
      }

      const result = buildResult(edition.id, raw, knownPersonIds);
      results.push(result);

      const variants = rawVariantsByKey.get(result.activityCanonicalKey) ?? [];
      variants.push(raw.activity);
      rawVariantsByKey.set(result.activityCanonicalKey, variants);
    }
  }

  const activities: PlannedActivity[] = [];
  const usedNameLower = new Set<string>();

  for (const [canonicalKey, rawVariants] of rawVariantsByKey.entries()) {
    const name = preferredDisplayName(canonicalKey, rawVariants);
    const nameLower = name.toLowerCase();
    if (usedNameLower.has(nameLower)) {
      throw new Error(
        `buildImportPlan: el nombre de actividad "${name}" (clave "${canonicalKey}") colisiona con otra Activity ya elegida (R3.6).`
      );
    }
    usedNameLower.add(nameLower);
    activities.push({ canonicalKey, name, rawVariants: Array.from(new Set(rawVariants)) });
  }

  return { results, skipped, activities };
}

/**
 * Transforma `HistoricoJson` -> `ImportPlan`, sin efectos secundarios ni
 * conexión a base de datos. Lanza `Error` con contexto si alguna invariante
 * de dominio (R4.4) no se cumple.
 */
export function buildImportPlan(source: HistoricoJson): ImportPlan {
  const editions = buildEditions(source);
  const people = buildPeople(source);
  const knownPersonIds = new Set(people.map((person) => person.jsonId));

  const { results, skipped, activities } = buildResultsAndActivities(source, knownPersonIds);

  return { editions, people, activities, results, skipped };
}

/**
 * Tipos del JSON de origen (`data/historico-medallas.json`) y del plan de
 * importación intermedio (`buildImportPlan.ts`).
 *
 * Este módulo es código puro (sin I/O): se reutiliza tanto desde el script de
 * importación (`importHistorico.ts`) como desde los tests de
 * `src/__tests__/scripts/historico/`.
 */

import type { Medal } from '@/types/domain';

/** Un participante crudo de una prueba: persona + color de medalla (o ninguna). */
export interface HistoricoParticipant {
  personId: string;
  medal: Medal | null;
}

/** Una prueba (`ActivityResult`) cruda, con su nombre de actividad sin normalizar. */
export interface HistoricoActivityResult {
  id: string;
  activity: string;
  participants: HistoricoParticipant[];
}

/** Una edición cruda del JSON, con todas sus pruebas. */
export interface HistoricoEdition {
  id: string;
  year: number;
  activityResults: HistoricoActivityResult[];
}

/** Una persona cruda del JSON. */
export interface HistoricoPerson {
  id: string;
  name: string;
}

/** Forma completa de `data/historico-medallas.json`. */
export interface HistoricoJson {
  source: string;
  medalScale: Medal[];
  people: HistoricoPerson[];
  editions: HistoricoEdition[];
}

/** Una `Edition` a crear, todavía con el id del JSON (no el uuid de Supabase). */
export interface PlannedEdition {
  jsonId: string;
  year: number;
}

/** Una `Person` a crear, todavía con el id del JSON. */
export interface PlannedPerson {
  jsonId: string;
  name: string;
}

/**
 * Una `Activity` deduplicada del catálogo: una entrada por clave canónica
 * (R3.1-R3.4), con el nombre de presentación elegido y las variantes crudas
 * que colapsaron en ella (para depuración/logging).
 */
export interface PlannedActivity {
  canonicalKey: string;
  name: string;
  rawVariants: string[];
}

/** Un `MedalAward` planeado: color + personas del JSON agrupadas por ese color. */
export interface PlannedMedalAward {
  medal: Medal;
  personJsonIds: string[];
}

/** Un `ActivityResult` planeado, con ids del JSON (aún sin traducir a uuid). */
export interface PlannedResult {
  jsonId: string;
  editionJsonId: string;
  activityCanonicalKey: string;
  participantJsonIds: string[];
  medalAwards: PlannedMedalAward[];
}

/** Una prueba del JSON omitida de la importación, con la razón (R4.5). */
export interface SkippedResult {
  jsonId: string;
  reason: string;
}

/** Plan de importación completo, salida pura de `buildImportPlan`. */
export interface ImportPlan {
  editions: PlannedEdition[];
  people: PlannedPerson[];
  activities: PlannedActivity[];
  results: PlannedResult[];
  skipped: SkippedResult[];
}

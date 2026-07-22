/**
 * Tipos de dominio de MedalleroSanPedro, alineados con `docs/domain-model.md`.
 *
 * Identificadores en inglés (camelCase); el copy de UI (Oro/Plata/Bronce) vive
 * solo en la capa de presentación, nunca aquí. Las columnas SQL equivalentes
 * usan snake_case (ver `supabase/migrations/`).
 */

/** Los tres colores de medalla posibles. */
export type Medal = 'gold' | 'silver' | 'bronze';

/** Una edición/año del medallero. */
export interface Edition {
  id: string;
  year: number;
  label: string | null;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
}

/** Una persona del roster histórico, la que puede ganar medallas. */
export interface Person {
  id: string;
  name: string;
  active: boolean;
  /** Usuario de Supabase Auth que reclamó esta persona (nullable, único). */
  claimedByUserId: string | null;
  createdAt: string;
}

/**
 * Extiende `auth.users` de Supabase. Sin campo de rol (ver ADR 0005): cualquier
 * `Profile` con `personId` no nulo puede escribir.
 */
export interface Profile {
  userId: string;
  email: string | null;
  personId: string | null;
  createdAt: string;
}

/** Catálogo de actividades/juegos, reutilizable entre `ActivityResult`. */
export interface Activity {
  id: string;
  name: string;
  createdAt: string;
}

/**
 * Una celebración concreta de una `Activity` dentro de una `Edition` (una
 * "prueba"). `participantIds` es el censo completo: quien participó sin
 * ganar medalla está en `participantIds` pero en ningún `MedalAward`.
 */
export interface ActivityResult {
  id: string;
  editionId: string;
  activityId: string;
  participantIds: string[];
  playedAt: string | null;
  notes: string | null;
  createdByUserId: string | null;
  createdAt: string;
}

/**
 * La medalla de un color concreto otorgada en un `ActivityResult`, con una o
 * varias personas (varias = empate o victoria por equipo, ver ADR 0004). Como
 * mucho un `MedalAward` por color y por `ActivityResult`.
 */
export interface MedalAward {
  id: string;
  resultId: string;
  medal: Medal;
  personIds: string[];
  createdAt: string;
}

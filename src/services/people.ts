import type { Person } from '@/types/domain';
import { supabase } from './supabase';

interface PersonRow {
  id: string;
  name: string;
  active: boolean;
  claimed_by_user_id: string | null;
  created_at: string;
}

function mapRow(row: PersonRow): Person {
  return {
    id: row.id,
    name: row.name,
    active: row.active,
    claimedByUserId: row.claimed_by_user_id,
    createdAt: row.created_at,
  };
}

/**
 * Error reconocible por la UI (R3.2): la `Person` que se intentaba reclamar
 * ya tenía dueño cuando llegó el `UPDATE` guardado de la RPC `claim_person`
 * (carrera perdida, o lista desactualizada).
 */
export class PersonAlreadyClaimedError extends Error {
  constructor() {
    super('Esa persona ya ha sido reclamada.');
    this.name = 'PersonAlreadyClaimedError';
  }
}

/**
 * Error reconocible por la UI: el nombre que se intentaba persistir ya
 * pertenece a otra `Person`, ignorando mayúsculas/minúsculas (índice único
 * `people_name_lower_key`) — mismo patrón que `ActivityNameTakenError`.
 */
export class PersonNameTakenError extends Error {
  constructor() {
    super('Ya existe una persona con ese nombre.');
    this.name = 'PersonNameTakenError';
  }
}

/** Todo el roster (activas e inactivas), ordenado por nombre (R4.1/R4.3). */
export async function listPeople(): Promise<Person[]> {
  const { data, error } = await supabase.from('people').select('*').order('name');

  if (error) {
    throw error;
  }

  return (data as PersonRow[]).map(mapRow);
}

/**
 * Alta de una nueva `Person` (R1.2). `active` toma su default `true` y
 * `claimed_by_user_id` queda `null`: nunca se envían aquí, así el `INSERT`
 * pasa el trigger `protect_person_claim` sin problema. La validación de
 * nombre no vacío vive en la pantalla (R1.3); aquí solo se recorta espacios.
 */
export async function createPerson(name: string): Promise<Person> {
  const { data, error } = await supabase.from('people').insert({ name: name.trim() }).select('*').single();

  if (error) {
    if (error.code === '23505') {
      throw new PersonNameTakenError();
    }
    throw error;
  }

  return mapRow(data as PersonRow);
}

/**
 * Renombra y/o cambia el estado `active` de una `Person` (R2.1/R2.2/R3.1). El
 * payload solo incluye las claves presentes en `changes`, nunca
 * `claimed_by_user_id` (R2.4): eso es lo que mantiene el `UPDATE` compatible
 * con el trigger `protect_person_claim`, que solo lo muta la RPC `claim_person`.
 */
export async function updatePerson(
  id: string,
  changes: { name?: string; active?: boolean }
): Promise<Person> {
  const payload: { name?: string; active?: boolean } = {};
  if (changes.name !== undefined) {
    payload.name = changes.name.trim();
  }
  if (changes.active !== undefined) {
    payload.active = changes.active;
  }

  const { data, error } = await supabase.from('people').update(payload).eq('id', id).select('*').single();

  if (error) {
    if (error.code === '23505') {
      throw new PersonNameTakenError();
    }
    throw error;
  }

  return mapRow(data as PersonRow);
}

/** `Person` reclamables: sin `claimed_by_user_id`, ordenadas por nombre (R3.1). */
export async function listClaimablePeople(): Promise<Person[]> {
  const { data, error } = await supabase
    .from('people')
    .select('*')
    .is('claimed_by_user_id', null)
    .order('name');

  if (error) {
    throw error;
  }

  return (data as PersonRow[]).map(mapRow);
}

/**
 * Reclama `personId` para el usuario autenticado vía la RPC atómica
 * `claim_person` (R2.4, R5.1). Traduce el error de "ya reclamada" (código
 * `23505` fijado por la RPC) a `PersonAlreadyClaimedError` para que la UI lo
 * distinga de otros fallos (R3.2).
 */
export async function claimPerson(personId: string): Promise<void> {
  const { error } = await supabase.rpc('claim_person', { target_person_id: personId });

  if (error) {
    if (error.code === '23505') {
      throw new PersonAlreadyClaimedError();
    }
    throw error;
  }
}

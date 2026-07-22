import type { Activity } from '@/types/domain';
import { supabase } from './supabase';

interface ActivityRow {
  id: string;
  name: string;
  created_at: string;
}

function mapRow(row: ActivityRow): Activity {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
  };
}

/**
 * Error reconocible por la UI (R1.5/R3.3): el nombre que se intentaba
 * persistir ya pertenece a otra `Activity`, ignorando mayúsculas/minúsculas
 * (índice único `activities_name_lower_key`).
 */
export class ActivityNameTakenError extends Error {
  constructor() {
    super('Ya existe una actividad con ese nombre.');
    this.name = 'ActivityNameTakenError';
  }
}

/** Todo el catálogo, ordenado por nombre (R4.1/R4.2). */
export async function listActivities(): Promise<Activity[]> {
  const { data, error } = await supabase.from('activities').select('*').order('name');

  if (error) {
    throw error;
  }

  return (data as ActivityRow[]).map(mapRow);
}

/**
 * Búsqueda de `Activity` por coincidencia de nombre (R2.1), primitivo
 * reutilizable también por `f-004-medal-results-registration`. Con `query`
 * vacío o solo espacios delega en el mismo camino que `listActivities` (R2.2).
 * No se escapa `%`/`_` del término: el catálogo es pequeño y familiar, y es
 * una query parametrizada de PostgREST, no una superficie de inyección (ver
 * `design.md`).
 */
export async function searchActivities(query: string): Promise<Activity[]> {
  const term = query.trim();

  if (!term) {
    return listActivities();
  }

  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .ilike('name', `%${term}%`)
    .order('name');

  if (error) {
    throw error;
  }

  return (data as ActivityRow[]).map(mapRow);
}

/**
 * Alta de una nueva `Activity` (R1.2). La validación de no-vacío vive en la
 * pantalla (R1.3); aquí solo se recorta espacios. Traduce la violación del
 * índice único case-insensitive (código `23505`) a `ActivityNameTakenError`
 * (R1.5).
 */
export async function createActivity(name: string): Promise<Activity> {
  const { data, error } = await supabase.from('activities').insert({ name: name.trim() }).select('*').single();

  if (error) {
    if (error.code === '23505') {
      throw new ActivityNameTakenError();
    }
    throw error;
  }

  return mapRow(data as ActivityRow);
}

/**
 * Renombrado de una `Activity` existente (R3.1). Único campo mutable de
 * `Activity`, sin abstracción prematura de un objeto `changes`. Traduce la
 * violación del índice único case-insensitive (código `23505`) a
 * `ActivityNameTakenError` (R3.3).
 */
export async function updateActivity(id: string, name: string): Promise<Activity> {
  const { data, error } = await supabase
    .from('activities')
    .update({ name: name.trim() })
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new ActivityNameTakenError();
    }
    throw error;
  }

  return mapRow(data as ActivityRow);
}

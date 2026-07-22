import type { Edition } from '@/types/domain';
import { supabase } from './supabase';

interface EditionRow {
  id: string;
  year: number;
  label: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

function mapRow(row: EditionRow): Edition {
  return {
    id: row.id,
    year: row.year,
    label: row.label,
    startDate: row.start_date,
    endDate: row.end_date,
    createdAt: row.created_at,
  };
}

/**
 * Error reconocible por la UI (R1.2/R2.2): el `year` que se intentaba
 * persistir ya pertenece a otra `Edition` (constraint `unique(year)`).
 */
export class EditionYearTakenError extends Error {
  constructor() {
    super('Ya existe una edición para ese año.');
    this.name = 'EditionYearTakenError';
  }
}

interface EditionInput {
  year: number;
  label?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}

/** Todas las ediciones ordenadas por año descendente (R3.1). */
export async function listEditions(): Promise<Edition[]> {
  const { data, error } = await supabase.from('editions').select('*').order('year', { ascending: false });

  if (error) {
    throw error;
  }

  return (data as EditionRow[]).map(mapRow);
}

/**
 * Alta de una nueva `Edition` (R1.1). `label`/`startDate`/`endDate` vacíos se
 * normalizan a `null` (R1.4). La validación de año entero y de rango de
 * fechas vive en la pantalla (R1.3/R1.5); aquí solo se normaliza y persiste.
 * Traduce la violación `unique(year)` (código `23505`) a
 * `EditionYearTakenError` (R1.2).
 */
export async function createEdition(input: EditionInput): Promise<Edition> {
  const label = input.label?.trim() ? input.label.trim() : null;
  const startDate = input.startDate ? input.startDate : null;
  const endDate = input.endDate ? input.endDate : null;

  const { data, error } = await supabase
    .from('editions')
    .insert({ year: input.year, label, start_date: startDate, end_date: endDate })
    .select('*')
    .single();

  if (error) {
    if (error.code === '23505') {
      throw new EditionYearTakenError();
    }
    throw error;
  }

  return mapRow(data as EditionRow);
}

/**
 * Edición parcial de una `Edition` existente (R2.1). El payload solo incluye
 * las claves presentes en `changes`. Traduce la violación `unique(year)`
 * (código `23505`) a `EditionYearTakenError` (R2.2).
 */
export async function updateEdition(id: string, changes: Partial<EditionInput>): Promise<Edition> {
  const payload: { year?: number; label?: string | null; start_date?: string | null; end_date?: string | null } = {};

  if (changes.year !== undefined) {
    payload.year = changes.year;
  }
  if (changes.label !== undefined) {
    payload.label = changes.label?.trim() ? changes.label.trim() : null;
  }
  if (changes.startDate !== undefined) {
    payload.start_date = changes.startDate ? changes.startDate : null;
  }
  if (changes.endDate !== undefined) {
    payload.end_date = changes.endDate ? changes.endDate : null;
  }

  const { data, error } = await supabase.from('editions').update(payload).eq('id', id).select('*').single();

  if (error) {
    if (error.code === '23505') {
      throw new EditionYearTakenError();
    }
    throw error;
  }

  return mapRow(data as EditionRow);
}

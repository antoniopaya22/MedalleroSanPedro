import type { Profile } from '@/types/domain';
import { supabase } from './supabase';

interface ProfileRow {
  user_id: string;
  email: string | null;
  person_id: string | null;
  created_at: string;
}

function mapRow(row: ProfileRow): Profile {
  return {
    userId: row.user_id,
    email: row.email,
    personId: row.person_id,
    createdAt: row.created_at,
  };
}

/**
 * El `Profile` del usuario autenticado, o `null` si no hay sesión o si
 * todavía no existe la fila (no debería ocurrir tras el trigger
 * `handle_new_user` de la migración de f-011, pero se contempla por
 * robustez). La política RLS `profiles_select_own` restringe además la fila
 * devuelta al propio dueño; aquí se filtra explícitamente por `user_id` para
 * no depender únicamente de RLS.
 */
export async function fetchMyProfile(): Promise<Profile | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle<ProfileRow>();

  if (error) {
    throw error;
  }

  return data ? mapRow(data) : null;
}

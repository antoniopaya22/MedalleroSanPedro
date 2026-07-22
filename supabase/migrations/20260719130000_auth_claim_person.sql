-- f-011-auth-google-sso: login con Google + reclamación atómica de Person.
--
-- Añade sobre el esquema de f-010 (20260719120000_init_schema.sql):
--   1. Auto-creación de `Profile` al alta de un usuario en `auth.users` (R2.1).
--   2. Protección de `people.claimed_by_user_id` frente al CRUD general de
--      `people` (R4.4): solo la RPC de reclamación puede mutarla.
--   3. La RPC atómica `claim_person(target_person_id uuid)` (R2.4, R3.2, R3.3,
--      R5.1): fija `profiles.person_id` y `people.claimed_by_user_id` en una
--      sola transacción `SECURITY DEFINER`.
--   4. Elimina la política `profiles_write_own` (cierre del hueco de f-010
--      señalado por el reviewer): ninguna ruta de escritura directa sobre
--      `profiles` queda abierta; las filas las crea el trigger (1) y
--      `person_id` solo lo fija la RPC (3), ambos `SECURITY DEFINER`.

-- ---------------------------------------------------------------------------
-- 1. Auto-creación de Profile al primer login (R2.1)
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, email)
  values (new.id, new.email)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 2. Protección de `people.claimed_by_user_id` (R4.4)
-- ---------------------------------------------------------------------------

-- El CRUD general de `people` (política `people_write_claimed_person` de
-- f-010) no debe poder fijar, reasignar ni "robar" una reclamación, ni por
-- UPDATE ni por INSERT directo (este último saltaría la RPC atómica por
-- completo, ya que `people_write_claimed_person` es `for all`). Solo la RPC
-- `claim_person` (más abajo) activa el flag transaccional `app.claiming`
-- justo antes de su propio UPDATE.
--
-- En un trigger `BEFORE INSERT`, `OLD` no está asignado: no se puede
-- referenciar directamente. Por eso se distingue `tg_op` en vez de comparar
-- siempre contra `old.claimed_by_user_id`.
create or replace function public.protect_person_claim()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (
       (tg_op = 'INSERT' and new.claimed_by_user_id is not null)
       or (tg_op = 'UPDATE' and new.claimed_by_user_id is distinct from old.claimed_by_user_id)
     )
     and coalesce(current_setting('app.claiming', true), 'off') <> 'on' then
    raise exception 'claimed_by_user_id solo puede modificarse mediante la función claim_person'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_person_claim on public.people;

-- Cubre tanto Create como Update: un INSERT con claimed_by_user_id NULL (alta
-- normal de persona, f-001) pasa sin problema; un INSERT o UPDATE que fije un
-- claimed_by_user_id fuera de la RPC lanza excepción.
create trigger protect_person_claim
  before insert or update on public.people
  for each row execute function public.protect_person_claim();

-- ---------------------------------------------------------------------------
-- 3. RPC atómica de reclamación (R2.4, R3.2, R3.3, R5.1)
-- ---------------------------------------------------------------------------

create or replace function public.claim_person(target_person_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_person_id uuid;
  updated_rows int;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión para reclamar una persona' using errcode = '42501';
  end if;

  -- Defensivo: garantiza que exista el Profile aunque el trigger de alta no
  -- se haya disparado todavía (p. ej. usuarios creados antes de esta migración).
  insert into public.profiles (user_id)
  values (auth.uid())
  on conflict (user_id) do nothing;

  select person_id into current_person_id
  from public.profiles
  where user_id = auth.uid();

  if current_person_id is not null then
    raise exception 'Ya has reclamado una persona; no puedes reclamar otra' using errcode = '42501';
  end if;

  -- Activa el flag transaccional que autoriza al trigger de protección (2) a
  -- dejar pasar el UPDATE de esta misma transacción.
  perform set_config('app.claiming', 'on', true);

  -- UPDATE guardado con WHERE claimed_by_user_id IS NULL: en una carrera entre
  -- dos usuarios, solo uno ve la fila libre y la actualiza (R5.1.c).
  update public.people
  set claimed_by_user_id = auth.uid()
  where id = target_person_id
    and claimed_by_user_id is null;

  get diagnostics updated_rows = row_count;

  if updated_rows = 0 then
    raise exception 'Esa persona ya ha sido reclamada' using errcode = '23505';
  end if;

  update public.profiles
  set person_id = target_person_id
  where user_id = auth.uid();
end;
$$;

revoke all on function public.claim_person(uuid) from public, anon;
grant execute on function public.claim_person(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Cierre del hueco `profiles_write_own` (R4.4)
-- ---------------------------------------------------------------------------

-- No se recrea ninguna política de escritura directa sobre `profiles`: las
-- filas las crea el trigger `handle_new_user` (1) y `person_id` solo lo fija
-- `claim_person` (3), ambos `SECURITY DEFINER` (bypassan RLS). Se conserva
-- `profiles_select_own` de f-010.
drop policy if exists "profiles_write_own" on public.profiles;

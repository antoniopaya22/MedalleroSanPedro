-- f-010-supabase-setup: esquema inicial del dominio de MedalleroSanPedro.
--
-- Crea las seis tablas de dominio (editions, people, profiles, activities,
-- activity_results, medal_awards), el enum `medal`, el helper de RLS
-- `public.has_claimed_person()` y activa Row Level Security con sus
-- políticas desde el primer día (ver docs/decisions/0001..0005 y
-- docs/domain-model.md). No incluye auth/onboarding (f-011) ni datos
-- (f-008): ver comentarios "Delegado a f-0XX" al final de cada bloque.

-- ---------------------------------------------------------------------------
-- Extensiones
-- ---------------------------------------------------------------------------

-- gen_random_uuid() requiere pgcrypto; activa por defecto en Supabase, pero se
-- declara aquí por si se aplica esta migración sobre un Postgres "limpio".
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------

-- Los tres colores de medalla posibles (coherente con el tipo `Medal` de
-- src/types/domain.ts). El copy Oro/Plata/Bronce es solo de UI, no vive aquí.
create type public.medal as enum ('gold', 'silver', 'bronze');

-- ---------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------

create table public.editions (
  id uuid primary key default gen_random_uuid(),
  year int not null unique,
  label text,
  start_date date,
  end_date date,
  created_at timestamptz not null default now()
);

create table public.people (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  active boolean not null default true,
  -- Reclamación 1-1 de persona por usuario (ADR 0002); el UPDATE que rellena
  -- esta columna en el flujo de onboarding es de f-011, aquí solo la columna
  -- y su constraint de unicidad.
  claimed_by_user_id uuid unique references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

-- Extiende auth.users. Sin columna `role` (ADR 0005): cualquier Profile con
-- person_id no nulo puede escribir. El trigger que auto-crea la fila al
-- primer login con Google es de f-011; aquí solo la tabla.
create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text,
  person_id uuid unique references public.people (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table public.activity_results (
  id uuid primary key default gen_random_uuid(),
  edition_id uuid not null references public.editions (id) on delete cascade,
  activity_id uuid not null references public.activities (id) on delete restrict,
  -- Censo completo de la prueba (participantes con y sin medalla): "participó
  -- sin medalla" es un estado almacenado, no derivable de medal_awards (ver
  -- docs/domain-model.md).
  participant_ids uuid[] not null default '{}',
  played_at date,
  notes text,
  created_by_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.medal_awards (
  id uuid primary key default gen_random_uuid(),
  result_id uuid not null references public.activity_results (id) on delete cascade,
  medal public.medal not null,
  -- Una o varias personas: varias = empate o victoria por equipo (ADR 0004).
  person_ids uuid[] not null check (cardinality(person_ids) >= 1),
  created_at timestamptz not null default now(),
  -- Como mucho un MedalAward por color y por ActivityResult (ADR 0004).
  unique (result_id, medal)
);

-- Invariantes de dominio delegadas a la capa de aplicación (no impuestas aquí
-- por CHECK/trigger de esquema):
--   - Los person_ids de cada MedalAward son subconjunto de los
--     participant_ids de su ActivityResult ("un ganador siempre participó").
--   - Una persona no puede aparecer en más de un MedalAward del mismo
--     ActivityResult (no se gana oro y bronce a la vez en la misma prueba).
-- Ambas son responsabilidad de f-004-medal-results-registration (validar
-- subconjuntos entre tablas con un trigger no es barato y no bloquea a
-- f-010; se documenta aquí en vez de implementarse silenciosamente).

-- ---------------------------------------------------------------------------
-- Helper de RLS: ¿el usuario autenticado tiene una Person reclamada?
-- ---------------------------------------------------------------------------

-- SECURITY DEFINER para poder leer public.profiles desde las políticas RLS de
-- otras tablas sin depender de que el propio SELECT en profiles esté abierto
-- (profiles solo es legible por su dueño, ver política más abajo).
create or replace function public.has_claimed_person()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select auth.uid() is not null and exists (
    select 1 from public.profiles
    where user_id = auth.uid() and person_id is not null
  );
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.editions enable row level security;
alter table public.people enable row level security;
alter table public.profiles enable row level security;
alter table public.activities enable row level security;
alter table public.activity_results enable row level security;
alter table public.medal_awards enable row level security;

-- Lectura pública (ADR 0003): anon y authenticated pueden leer las cinco
-- tablas "de consulta" sin necesidad de sesión.
create policy "editions_select_public" on public.editions
  for select to anon, authenticated using (true);

create policy "people_select_public" on public.people
  for select to anon, authenticated using (true);

create policy "activities_select_public" on public.activities
  for select to anon, authenticated using (true);

create policy "activity_results_select_public" on public.activity_results
  for select to anon, authenticated using (true);

create policy "medal_awards_select_public" on public.medal_awards
  for select to anon, authenticated using (true);

-- profiles: solo el propio dueño puede leer su fila (contiene email); nunca
-- abierto a anon.
create policy "profiles_select_own" on public.profiles
  for select to authenticated using (user_id = auth.uid());

-- Escritura (ADR 0005): autenticado con person_id no nulo en su Profile.
-- Ninguna política de escritura para el rol anon en ninguna tabla.
create policy "editions_write_claimed_person" on public.editions
  for all to authenticated
  using (public.has_claimed_person())
  with check (public.has_claimed_person());

create policy "people_write_claimed_person" on public.people
  for all to authenticated
  using (public.has_claimed_person())
  with check (public.has_claimed_person());

create policy "activities_write_claimed_person" on public.activities
  for all to authenticated
  using (public.has_claimed_person())
  with check (public.has_claimed_person());

create policy "activity_results_write_claimed_person" on public.activity_results
  for all to authenticated
  using (public.has_claimed_person())
  with check (public.has_claimed_person());

create policy "medal_awards_write_claimed_person" on public.medal_awards
  for all to authenticated
  using (public.has_claimed_person())
  with check (public.has_claimed_person());

-- profiles: cada usuario gestiona únicamente su propia fila. El trigger de
-- auto-creación al primer login y el flujo de reclamar Person (UPDATE de
-- people.claimed_by_user_id por un usuario aún sin persona, dentro de una
-- transacción/RPC) son de f-011-auth-google-sso; esta política NO permite
-- reclamar una persona sin tenerla todavía, solo que el dueño edite su fila
-- de profiles (p. ej. su email si Supabase lo actualiza).
create policy "profiles_write_own" on public.profiles
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Plan de mejoras (fase 1): índice único case-insensitive sobre el nombre de
-- `people`, mismo patrón que `activities_name_lower_key`
-- (20260720190000_activities_unique_name.sql). Hoy `createPerson` no
-- comprueba unicidad: dos altas de "Ana García" (o una variante en
-- mayúsculas) quedan ambiguas en todos los rankings. No modifica RLS ni
-- columnas: la tabla y sus políticas ya existen desde
-- `20260719120000_init_schema.sql`.
--
-- A diferencia de `activities`, `people` puede ya tener filas (roster
-- histórico importado por f-008): si existiera algún duplicado real de
-- nombre, esta migración fallaría al crear el índice. Verificar antes de
-- aplicar con:
--   select lower(name), count(*) from public.people group by 1 having count(*) > 1;

create unique index if not exists people_name_lower_key
  on public.people (lower(name));

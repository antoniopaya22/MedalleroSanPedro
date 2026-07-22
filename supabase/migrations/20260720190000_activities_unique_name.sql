-- f-003-activities-catalog: índice único case-insensitive sobre el nombre de
-- `activities`, para que el alta y el renombrado no puedan crear duplicados
-- que solo difieran en mayúsculas/minúsculas (R1.5/R3.3). No modifica RLS ni
-- columnas: la tabla y sus políticas ya existen desde
-- `20260719120000_init_schema.sql`. Seguro de aplicar: el catálogo está vacío
-- (la importación del histórico es f-008, aún no ejecutada).

create unique index if not exists activities_name_lower_key
  on public.activities (lower(name));

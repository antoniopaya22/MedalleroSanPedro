# f-003-activities-catalog — Tareas

Checklist ordenado. Marcar `- [x]` un item a la vez, nunca en bloque.

## Migración

- [x] Crear `supabase/migrations/20260720190000_activities_unique_name.sql` con un índice único case-insensitive `create unique index if not exists activities_name_lower_key on public.activities (lower(name));` (R1.5/R3.3). Sin cambios de RLS ni de columnas.

## Servicios

- [x] Crear `src/services/activities.ts` con `ActivityRow`, `mapRow` y `ActivityNameTakenError` (patrón de `editions.ts`)
- [x] `listActivities()`: `from('activities').select('*').order('name')`, mapea, lanza en error (R4.1/R4.2)
- [x] `searchActivities(query)`: si `query.trim()` vacío delega en el camino de `listActivities` (R2.2); si no, `select('*').ilike('name', '%term%').order('name')`, mapea, lanza en error (R2.1)
- [x] `createActivity(name)`: `trim`, `insert({ name })`, `.select('*').single()`, mapea; traduce `code '23505'` a `ActivityNameTakenError`, propaga otros errores (R1.2/R1.5)
- [x] `updateActivity(id, name)`: `trim`, `update({ name }).eq('id', id).select('*').single()`, mapea; traduce `23505` a `ActivityNameTakenError` (R3.1/R3.3)

## Pantallas

- [x] Crear `src/app/activities/index.tsx`: catálogo con `listActivities`, buscador (`TextField`, filtrado case-insensitive; `searchActivities` queda como primitivo de servicio), botón "Añadir actividad" y filas editables solo si `canWrite`, `EmptyState` en vacío y en "sin resultados", recarga al enfocar (R2/R4/R5)
- [x] Crear `src/app/activities/new.tsx`: guarda `canWrite` (redirect a `/activities/index` si no), `TextField` nombre + validación no-vacío, coincidencias en vivo para reutilizar (R2.3), `createActivity`, manejo de `ActivityNameTakenError` (R1.5) y de error genérico (R1.4)
- [x] Crear `src/app/activities/[id].tsx`: guarda `canWrite`, carga por `id` desde `listActivities`, renombrar con validación (R3.2) y manejo de `ActivityNameTakenError` (R3.3)
- [x] Editar ADITIVAMENTE `src/app/_layout.tsx`: añadir rutas `activities/index`, `activities/new`, `activities/[id]` sin tocar las de `people`/`editions` (releer el archivo antes de editar)
- [x] Editar ADITIVAMENTE `src/app/index.tsx`: añadir tarjeta "Actividades" → `/activities/index` sin tocar las tarjetas existentes (releer antes de editar)

## Tests

- [x] Crear `src/__tests__/services/activities.test.ts`: casos de `listActivities`, `searchActivities` (con y sin término, `ilike`), `createActivity` (incluye traducción de `23505` a `ActivityNameTakenError`) y `updateActivity` (incluye `23505`)
- [x] Crear `src/__tests__/app/activities/index.test.tsx`: `canWrite=false` oculta "Añadir actividad" (filas no accionables) y `canWrite=true` lo muestra; un caso de filtrado por el buscador (mock de `@/context/AuthContext` y `@/services/activities`, `await render`, `await fireEvent.changeText`)
- [x] Crear `src/__tests__/app/activities/new.test.tsx`: guarda de escritura (redirect si `!canWrite`), validación de nombre vacío, alta correcta, y manejo de `ActivityNameTakenError` mostrando el mensaje de duplicado

## Verificación

- [x] `npm run typecheck` y `npm test` en verde
- [x] Añadir nota en `supabase/README.md`: el alta y el renombrado de `activities` quedan cubiertos por la verificación manual de escritura de f-011 (usuario sin `Person`/`anon` no puede escribir en `activities`); y documentar la nueva migración del índice único case-insensitive de nombre

# f-002 — Gestión de ediciones (años) · Tareas

Checklist ordenado. El implementer marca `- [x]` un item a la vez, nunca en bloque.
Referencia de patrón: `src/services/people.ts` y `src/app/people/*` (NO tocarlos, son de f-001).

- [x] Crear `src/services/editions.ts` con `EditionRow`, `mapRow`, `EditionYearTakenError`, y `listEditions` (order `year` desc, R3.1)
- [x] Añadir `createEdition(input)` a `src/services/editions.ts`: normaliza `label`/fechas vacías a `null` (R1.4) y traduce el código `23505` a `EditionYearTakenError` (R1.2)
- [x] Añadir `updateEdition(id, changes)` a `src/services/editions.ts`: payload solo con claves cambiadas, misma traducción de `23505` (R2.1/R2.2)
- [x] Test `src/__tests__/services/editions.test.ts` (espeja `people.test.ts`): `listEditions` ordena por año desc; `createEdition` normaliza a null y lanza `EditionYearTakenError` en `23505`; `updateEdition` envía solo lo cambiado y traduce `23505`
- [x] Crear `src/app/editions/index.tsx`: listado con recarga al enfocar, `EmptyState` (R3.2), botón "Añadir edición" y filas navegables solo si `canWrite` (R4.2)
- [x] Crear `src/app/editions/new.tsx`: guard `!canWrite` → redirige (R4.3); validación de año entero (R1.3) y rango de fechas (R1.5); mensaje de año duplicado en `EditionYearTakenError` (R1.2)
- [x] Crear `src/app/editions/[id].tsx`: guard `!canWrite` → redirige (R4.3); carga por `find(id)`; edición con manejo de `EditionYearTakenError` (R2.2)
- [x] Registrar las rutas `editions/index`, `editions/new`, `editions/[id]` en el `Stack` de `src/app/_layout.tsx`
- [x] Añadir tarjeta de acceso "Ediciones" en `src/app/index.tsx` (releer el archivo justo antes por concurrencia con f-001; solo añadir la tarjeta)
- [x] Ejecutar `npm test` y `npm run typecheck`; dejar la suite en verde (los errores residuales de tsc atribuibles a f-001, si los hubiera, se documentan pero no se corrigen aquí)
- [x] (Paridad post-revisión) Añadir `src/__tests__/app/editions/index.test.tsx` y `src/__tests__/app/editions/new.test.tsx`, espejando `src/__tests__/app/people/*.test.tsx`, para cubrir con tests de pantalla el gating de escritura (R4.2/R4.3)

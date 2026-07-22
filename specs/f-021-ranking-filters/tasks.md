# f-021-ranking-filters - Tareas

- [x] 1. `src/services/rankings.ts`: `ActivityResultRankingRow` gana `edition_id`; `fetchActivityResults`
      selecciona también `edition_id`. `listHistoricRanking` acepta `yearRange?: YearRange`
      (`{ fromYear?, toYear? }`), resuelve ediciones en rango vía `listEditions()`, filtra
      `results`/`awards` en cliente por el mismo `resultIdSet` (diseño §R1).
- [x] 2. Tests de `listHistoricRanking(yearRange)` en `rankings.test.ts` (con rango, sin
      ediciones en rango → `[]`, sin rango = comportamiento actual sin cambios).
- [x] 3. `rankings/historic.tsx`: chips "Todas"/"Últimos 5 años"/"Últimos 10 años", recarga al
      cambiar (`listHistoricRanking(yearRange)`), toggle de orden existente intacto encima del
      resultado filtrado.
- [x] 4. `people/index.tsx`: buscador por nombre (mismo patrón que `activities/index.tsx`) +
      chips Todos/Activos/Inactivos, combinables en cliente; nuevo `EmptyState` "Sin resultados".
- [x] 5. `rankings/editions/[id].tsx`: toggle "Por puntos"/"Por promedio" (mismo patrón que
      `rankings/historic.tsx`/`rankings/activities/[id].tsx`).
- [x] 6. `rankings/activities/[id].tsx`: chips de edición (scroll horizontal) que filtran solo
      la sección "Histórico de pruebas", en cliente, sin tocar "Clasificación".
- [x] 7. Tests de pantalla actualizados/nuevos: `rankings-historic.test.tsx`,
      `people/index.test.tsx`, `rankings-editions.test.tsx`, `rankings-activities.test.tsx`.
- [x] 8. `npx tsc --noEmit` y `npm test` en verde (36 suites / 253 tests).
- [x] 9. Verificación en vivo (browser) del rango de años en histórico (recalculo real contra
      Supabase, no recorte visual) y del buscador de Participantes.
- [x] 10. Revisión (`reviewer`).

## Hallazgo del reviewer, corregido antes de cerrar

`editionOptions` en `rankings/activities/[id].tsx` ordenaba las chips con
`b.editionId.localeCompare(a.editionId)` — `edition_id` es un uuid en producción, no ordenable
cronológicamente por string, así que "más reciente primero" no estaba garantizado (el fixture
del test usaba ids literales `e2026`/`e2025` que coincidían por casualidad con el orden
alfabético, enmascarando el bug). Corregido a ordenar por `entry.editionYear` descendente (mismo
criterio que `buildPersonEditionBreakdown` en `rankings.ts`). Test reescrito con ids
"adversariales" (`aaa-edition-2026`/`zzz-edition-2025`) que fallarían bajo el ordenamiento
anterior, más una aserción explícita de orden de las chips.

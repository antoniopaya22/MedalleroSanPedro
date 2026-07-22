# f-018-person-performance-charts - Tareas

- [x] 1. `src/services/rankings.ts`: exportar `MEDAL_VALUES`; añadir `PersonEditionBreakdownRow`,
      `PersonActivityBreakdownRow`, `buildPersonEditionBreakdown`, `buildPersonActivityBreakdown`
      (import de tipo `PersonHistoryEntry` desde `./activityResults`), según diseño §1.
- [x] 2. Tests unitarios de ambas funciones en `src/__tests__/services/rankings.test.ts`
      (multi-edición/actividad, orden R1.2/R3.2, desempates R3.3, historial vacío, participación
      sin medalla).
- [x] 3. `src/components/people/PersonEditionBarChart.tsx` (barras `View`/flexbox, diseño §2).
- [x] 4. `src/components/people/PersonActivityBreakdownList.tsx` (lista `Card`/`ListRow`, diseño §2).
- [x] 5. (Ajustado en implementación: sin tests de componente aislados, siguiendo el precedente
      de `EditionRankingList` — se cubren vía `people-id.test.tsx`, tarea 7).
- [x] 6. Integrar en `src/app/(tabs)/people/[id]/index.tsx`: `useMemo` de ambos breakdowns,
      nuevas secciones, solo cuando `history.length > 0` (diseño §3, R4.1). De paso, corregido el
      label "medallas/participación" (residual de antes de la puntuación oro/plata/bronce) a
      "puntos/participación".
- [x] 7. Actualizado `src/__tests__/app/people-id.test.tsx` con los casos nuevos (secciones
      visibles con histórico multi-edición/actividad, orden por promedio propio no por fecha;
      secciones ausentes sin histórico, R4.1).
- [x] 8. `npx tsc --noEmit` y `npm test` en verde (35 suites / 220 tests).
- [x] 9. Revisión (`reviewer`).
- [x] 10. Addendum (feedback de usuario post-entrega): dividir `people/[id]/index.tsx` en
      pestañas Resumen/Histórico/Actividades (diseño §3.1) para evitar el scroll único larguísimo
      en personas con historial extenso (ej. 700+ participaciones). Nuevo `EmptyState` "Sin
      actividades" para la pestaña Actividades cuando `activityBreakdown` está vacío. Tests de
      `people-id.test.tsx` reescritos para navegar pestañas antes de aserciones tab-scoped.
      `npx tsc --noEmit` y `npm test` en verde (35 suites / 231 tests).

## Hallazgo fuera de alcance encontrado y corregido durante la implementación

Al verificar en vivo contra datos reales (persona con 714 participaciones), `listPersonHistory`
(f-017, `src/services/activityResults.ts`) fallaba con 400 Bad Request: consultaba
`medal_awards` con `.in('result_id', ids)` pasando el id de **cada** prueba de esa persona,
generando una URL demasiado larga (mismo bug de clase ya corregido en `rankings.ts` para el
ranking histórico). Corregido para filtrar `medal_awards` por `.contains('person_ids', [personId])`
directamente, sin depender del número de pruebas. Tests de `personHistory.test.ts` actualizados.
Este fix era necesario para que f-018 funcionara con personas de historial largo, no opcional.

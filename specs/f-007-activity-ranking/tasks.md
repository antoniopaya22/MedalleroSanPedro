# f-007-activity-ranking - Tareas

- [x] Añadir `listActivityRanking(activityId)` a `src/services/rankings.ts` (filtra `activity_results` por `activity_id`, reutiliza `buildRanking`) y exportar el alias `ActivityRankingRow`
- [x] Generalizar el orden por promedio: `sortRanking(rows, mode)` reutilizando los comparadores existentes, manteniendo `sortHistoricRanking` como alias exportado (sin romper f-006)
- [x] Añadir `listActivityHistory(activityId)` a `src/services/activityResults.ts` (pruebas de la actividad con año de edición, nº de participantes y medallas con nombres de ganadores; orden reciente→antigua, medallas oro/plata/bronce)
- [x] Crear `src/app/rankings/activities/index.tsx` (selector/buscador público de actividad, sin controles de escritura, estado vacío)
- [x] Crear `src/app/rankings/activities/[id].tsx` (histórico de pruebas + clasificación agregada de la actividad con toggle medallas/promedio, estados vacíos)
- [x] Registrar las rutas `rankings/activities/index` y `rankings/activities/[id]` en `src/app/_layout.tsx`
- [x] Convertir la `NavCard` "Clasificación por actividad" de PRÓXIMAMENTE en tarjeta pública activa en EXPLORAR (Home) y retirar la sección PRÓXIMAMENTE vacía
- [x] Tests de servicio: `listActivityRanking` (filtro por actividad, agregación multi-edición, participación sin medalla, sin pruebas) y `listActivityHistory` (filtro, nombres de ganadores, año, participantes, orden, sin pruebas)
- [x] Tests de app: selector filtra/navega; detalle muestra histórico + clasificación, toggle reordena sin re-consultar, sin controles de escritura, estados vacíos
- [x] `npm run typecheck` y `npm test` en verde (incluidos los tests heredados de f-005/f-006)

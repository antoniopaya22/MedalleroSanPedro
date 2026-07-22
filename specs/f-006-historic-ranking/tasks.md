# f-006-historic-ranking - Tareas

- [x] Extraer la agregacion comun de ranking a un helper interno en `src/services/rankings.ts` sin romper `listEditionRanking` ni sus tests
- [x] Anadir `listHistoricRanking()` (agrega todas las ediciones, sin filtro `edition_id`)
- [x] Anadir comparador/`sortHistoricRanking` para el orden por promedio (medalsPerParticipation) y exportarlo
- [x] Crear `src/app/rankings/historic.tsx` (lista publica + toggle "Por medallas" / "Por promedio" + estado vacio)
- [x] Registrar la ruta `rankings/historic` en `_layout.tsx`
- [x] Anadir entrada publica "Clasificacion historica" en la Home y limpiar el placeholder cubierto
- [x] Tests de servicio: agregacion historica, participacion sin medalla, sin resultados, y reordenado por promedio
- [x] Tests de app: desglose/total/participaciones/promedio y toggle que reordena sin re-consultar
- [x] `npm run typecheck` y `npm test` en verde (incluidos los tests heredados de f-005)

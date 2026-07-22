# f-017-person-detail-view - Tareas

- [x] Anadir `listPersonSummary(personId)` a `src/services/rankings.ts` (filtra el resultado de `listHistoricRanking` por `personId`, devuelve `HistoricRankingRow | null`; `null` si la persona no ha jugado)
- [x] Anadir `listPersonHistory(personId)` y el tipo `PersonHistoryEntry` a `src/services/activityResults.ts` (query `.contains('participant_ids', [personId])`, resolver edicion/actividad/medalla propia por prueba, orden reciente-primero; `[]` si no hay pruebas)
- [x] Mover el formulario actual `src/app/(tabs)/people/[id].tsx` a `src/app/(tabs)/people/[id]/edit.tsx` (contenido casi intacto; ajustar el destino del `router.replace` del guard `!canWrite` a `{ pathname: '/people/[id]', params: { id } }`) y eliminar `[id].tsx`
- [x] Crear `src/app/(tabs)/people/[id]/index.tsx`: vista de detalle publica (cabecera con nombre + Badge "Inactiva", resumen de medallas via `listPersonSummary`, historico via `listPersonHistory`, `useFocusEffect`, estado vacio, persona inexistente, error recuperable)
- [x] Actualizar `src/app/(tabs)/people/_layout.tsx`: sustituir `Stack.Screen name="[id]"` por `[id]/index` (title "Participante") y `[id]/edit` (title "Editar persona")
- [x] Anadir en el detalle el FAB local (visible solo si `canWrite && person.active`) que navega a `/results/new` con `params: { participantId: id }`
- [x] Anadir en el detalle el punto de entrada a `/people/[id]/edit` visible solo si `canWrite`
- [x] Modificar `src/app/results/new.tsx` para leer `participantId` de params y preseleccionarlo como participante tras cargar (solo si es una persona activa cargada; sin romper el flujo sin parametro ni el `editionId` de f-016)
- [x] Modificar `src/app/(tabs)/people/index.tsx`: navegacion al detalle para cualquier usuario (`onPress` y `showChevron` ya no condicionados a `canWrite`); mantener "Anadir persona" bajo `canWrite`; conservar el Badge "Inactiva"
- [x] Tests servicio: `listPersonSummary` (con/sin participaciones) y `listPersonHistory` (medalla propia, participacion sin medalla, sin pruebas, orden)
- [x] Tests app detalle: resumen + historico, resumen en ceros + historico vacio, persona inexistente, persona inactiva (sin FAB), FAB solo con `canWrite` + persona activa
- [x] Tests app `results/new`: preseleccion con `participantId` (persona activa), inactiva no se preselecciona, arranque sin parametro
- [x] Tests app `[id]/edit`: acceso bloqueado (redirige) sin `canWrite`
- [x] `npx tsc --noEmit` limpio y `npm test` en verde

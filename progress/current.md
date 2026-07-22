# Estado actual

- **Ultima feature cerrada (esta sesion):** `f-021-ranking-filters` (`should`) — `done`.
  Spec en `specs/f-021-ranking-filters/` (requirements EARS R1-R5, design, tasks). Pedido del
  usuario: filtros en clasificaciones y listados. 4 partes: (1) rango de anos (Todas/Ultimos
  5/Ultimos 10, sobre el ano de edicion mas reciente en los datos, no la fecha real) en
  Clasificacion historica, recalculando la agregacion real contra Supabase (no un recorte
  visual); (2) buscador + filtro Todos/Activos/Inactivos en Participantes, combinables en
  cliente; (3) toggle "Por medallas"/"Por promedio" en `rankings/editions/[id].tsx` (unica
  pantalla de ranking que no lo tenia); (4) chips de edicion (cliente, sin refetch) en el
  historico de pruebas de `rankings/activities/[id].tsx`. Revisada por `reviewer`: 1 hallazgo
  real (no bloqueante por EARS pero si bug de UX) corregido antes de cerrar, ver notas de
  cierre; resto sin hallazgos.
- Ya `done`: f-000, f-010, f-011, f-012, f-001, f-002, f-003, f-004, f-005,
  f-006, f-007, f-008, f-013, f-014, f-015, f-016, f-017, f-018, f-019, f-020, f-021.

## En curso

- Ninguna feature activa (de esta sesion; puede haber trabajo de sesiones paralelas, ver
  `feature_list.json` para el estado mas actual).

## Backlog restante

- Revisar `feature_list.json` para el estado mas actual (hay trabajo concurrente de otras
  sesiones sobre este mismo repo).

## Notas de cierre de f-021

- `src/services/rankings.ts`: `ActivityResultRankingRow` gana `edition_id` (ya estaba en la
  tabla, solo se empieza a seleccionar); `listHistoricRanking(yearRange?)` resuelve ediciones en
  rango via `listEditions()` (nuevo import) y filtra `results`/`awards` en cliente por el mismo
  `resultIdSet` derivado — filtrar solo uno de los dos habria contado medallas/participaciones
  de fuera de rango, `buildRanking` no sabe nada de "rango de anos", agrega ciegamente lo que se
  le pase.
- `rankings/historic.tsx`: chips Todas/Ultimos 5/Ultimos 10 anos; a diferencia del toggle de
  orden (puramente en cliente), cambiar de rango SI recarga contra Supabase (recalculo real,
  verificado en vivo: de 21 personas/701 medallas de Sergio en "Todas" a 19 personas/276
  medallas en "Ultimos 5 anos"). El "ano mas reciente" para calcular el rango sale de
  `listEditions()` (los datos), no de `Date.now()`.
- `people/index.tsx`: buscador + chips Todos/Activos/Inactivos, mismo patron que el buscador ya
  existente de `activities/index.tsx`, combinados en un unico `useMemo`.
- `rankings/editions/[id].tsx`: toggle "Por medallas"/"Por promedio" (`sortRanking`), ausente
  hasta ahora pese a que las otras 2 pantallas de ranking (historico, actividad) ya lo tenian.
- `rankings/activities/[id].tsx`: chips de edicion (scroll horizontal, `testID` por chip) que
  filtran solo "Historico de pruebas" en cliente, sin tocar "Clasificacion".
- **Hallazgo del `reviewer` corregido antes de cerrar:** las chips de edicion de
  `rankings/activities/[id].tsx` se ordenaban por `editionId.localeCompare(...)` — `edition_id`
  es un uuid en produccion, no ordenable cronologicamente por string, asi que "mas reciente
  primero" no estaba garantizado. El test original usaba ids literales (`e2026`/`e2025`) que
  coincidian por casualidad con el orden alfabetico correcto, enmascarando el bug. Corregido a
  ordenar por `entry.editionYear` descendente; test reescrito con ids "adversariales"
  (`aaa-edition-2026`/`zzz-edition-2025`) que fallarian bajo el ordenamiento anterior, mas
  aserción explícita de orden. **Vigilar este patron: nunca ordenar por un id/uuid asumiendo que
  correlaciona con un campo temporal/numerico.**
- Test: `npx tsc --noEmit` limpio; `npx jest` 36 suites / 253 tests en verde.

## Notas de cierre de f-020

- `listEditionHistory(editionId)` filtra `activity_results` por `edition_id` (a diferencia
  de `listActivityHistory` que filtra por `activity_id`), resuelve nombre de actividad por
  prueba, medallas/ganadores via `resolveMedals` (helper extraido, mismo resultado que
  antes para `listActivityHistory`, tests existentes de esa funcion siguen en verde), orden
  por `played_at` descendente con nulos al final via comparador local
  `comparePlayedAtDescending` (no reutiliza `compareByEditionRecency` a proposito: aqui solo
  hace falta ordenar por fecha, es una sola edicion).
- `.in('result_id', resultIds)` en `listEditionHistory` es seguro aqui: maximo real de
  ~92 resultados por edicion en el historico (vs. cientos por persona que obligo a usar
  `.contains(...)` en f-017/f-018) — verificado contra `data/historico-medallas.json`.
- Toggle "Por puntos"/"Por promedio" y cambio de pestana son puramente en cliente
  (`useMemo`), sin recargar datos; verificado con test de "llamado 1 vez" a los servicios.
- No se toco `rankings/editions/[id].tsx` (pantalla separada de f-005, fuera de alcance),
  ni rutas/esquema/RLS.
- 2 nits no bloqueantes senalados por el reviewer (aceptados sin cambio): (1)
  `compareByEditionRecency` y el nuevo `comparePlayedAtDescending` repiten literalmente la
  misma cola de "nulos al final" (candidato a un helper compartido en el futuro); (2)
  `ActivityHistoryAwardRow`/`EditionHistoryAwardRow` son estructuralmente identicas.
- Test: `npx tsc --noEmit` limpio; `npx jest` 36 suites / 243 tests en verde.
- **Addendum post-entrega (feedback de usuario, mismo dia):** el toggle "Por puntos"/"Por
  promedio" de la pestaña Clasificacion usaba la misma fila de `Button` primary/outline a
  todo el ancho que las pestañas Clasificacion/Actividades de arriba — confuso, parecian
  dos barras de pestañas apiladas. Corregido SIN nueva feature en el backlog (retoque visual
  de algo ya `done`, no capacidad nueva): el toggle paso a un segmented control compacto
  (`Ordenar por` + dos chips `radius.pill` dentro de un contenedor `colors.surfaceAlt`,
  chip activo con `colors.surface` + `shadows.sm`), alineado a la izquierda y con texto
  `caption` mas pequeño, claramente distinto de las pestañas de arriba (`Button size="sm"
  fullWidth`). Mismas etiquetas exactas ("Por puntos"/"Por promedio") y mismo `sortMode`,
  ningun test tuvo que cambiar (14/14 en `editions-id.test.tsx` siguen en verde). Verificado
  visualmente en `expo start --web`: posicion/tamaño de los elementos confirma la
  separacion (pestañas a ancho completo arriba, toggle compacto alineado a la izquierda
  debajo). `npx tsc --noEmit` limpio; `npx jest` 36 suites / 243 tests en verde (mismo
  recuento, sin tests nuevos ni perdidos).

## Notas de cierre de f-019

- Un solo componente (`src/app/results/new.tsx`) con `enum Step` (Edition, Activity,
  Participants, Medals, Details, Summary) y estado `currentStep`; `goNext`/`goBack`/
  `goToStep`, `ProgressIndicator` ("Paso X de 6" + barra `View`/`width %`, sin libreria ni
  SVG), `SummaryBlock` con `onEdit` por bloque que reutiliza `goToStep`.
- Preseleccion: `editionId` resuelto -> arranca en paso Actividad; `participantId` resuelto
  (persona activa) -> se anade como participante y arranca en paso Edicion (o Actividad si
  ambos params llegan validos); persona inactiva via `participantId` se ignora.
- Test: `npx tsc --noEmit` limpio; `npx jest` 35 suites / 234 tests en verde (22 tests propios
  de `results/new.test.tsx`, reescritos completos para el flujo por pasos).

## Notas de cierre de f-018 (sesion paralela)

- Graficos de rendimiento en `/people/[id]` (f-017): puntos por edicion + promedio por
  participacion (barras `View`/flexbox, sin libreria de charts) y actividades ordenadas por
  su propio mejor promedio. Agregacion pura en `rankings.ts`
  (`buildPersonEditionBreakdown`/`buildPersonActivityBreakdown`) sobre `PersonHistoryEntry[]`
  ya cargado, sin queries nuevas.
- **Bug real corregido durante la verificacion:** `listPersonHistory` (f-017) construia un
  `.in('result_id', ids)` que superaba el limite de URL de Supabase para personas con mucho
  historico (700+ participaciones) → 400 Bad Request. Corregido filtrando `medal_awards` por
  `.contains('person_ids', [personId])`. Mismo patron de bug ya visto antes en `rankings.ts`
  para el ranking historico — **vigilar cualquier query futura que construya `.in(...)` a
  partir de "todas las pruebas de una persona/entidad con mucho historico"** (f-020 ya lo
  tuvo en cuenta y verifico que su caso, por edicion, no aplica).
- Addendum post-entrega: la vista de detalle de persona se dividio en 3 pestañas (Resumen/
  Historico/Actividades) por scroll excesivo con datos reales; mismo patron de pestanas que
  luego reutilizo f-020 para el detalle de edicion.

## Notas de cierre de f-017 (referencia patron rutas anidadas)

- Rutas: `people/[id]/index.tsx` (detalle publico) + `[id]/edit.tsx` (formulario movido).
  El `implementer` dejo sin borrar el `people/[id].tsx` plano original (colision de rutas
  expo-router); el `reviewer` lo marco BLOQUEANTE y se elimino antes de cerrar. Vigilar este
  descuido en futuras reestructuraciones de rutas anidadas ([id].tsx -> [id]/ con index+edit).

## Pendiente del usuario (heredado de f-011, sin cambios)

- Configurar Google en Supabase Auth y el redirect deep link para el OAuth real.

---
*Este archivo se sobrescribe cada sesion. El historico va en [history.md](history.md).*

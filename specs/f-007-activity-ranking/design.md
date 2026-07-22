# f-007-activity-ranking - Diseño

Generaliza el patrón de ranking de `f-005`/`f-006` a **una actividad concreta a
través de todas las ediciones**, precedido de un paso de selección/búsqueda de
actividad (patrón del buscador de `f-003`) y acompañado de un listado del
histórico de pruebas de esa actividad con sus medallas.

Tres piezas: (1) elegir actividad, (2) histórico de pruebas de la actividad,
(3) clasificación agregada solo dentro de la actividad. Vista de **solo
lectura**, accesible sin sesión.

## Servicios

### `src/services/rankings.ts` (extender, sin romper f-005/f-006)

Añadir el ranking agregado de una actividad, reutilizando el helper interno
`buildRanking` ya existente (participaciones desde `participant_ids`, medallas
desde `person_ids`, promedio `total / participations`):

- `listActivityRanking(activityId: string): Promise<ActivityRankingRow[]>` —
  paralelo exacto de `listEditionRanking`, pero filtrando
  `activity_results` por `.eq('activity_id', activityId)` (todas las ediciones)
  en vez de por `edition_id`. Igual que las otras: `fetchPeople()`, resultados
  filtrados, `fetchAwardsForResults(...)` (no consulta `medal_awards` si no hay
  resultados), `buildRanking(...)`. Devuelve la lista ya ordenada "por medallas".
- Exportar el alias de tipo `ActivityRankingRow = RankingRow`.
- Para el orden "por promedio" (R3.6) reutilizar los comparadores existentes.
  Como `sortHistoricRanking(rows, mode)` opera sobre `RankingRow` genérico, se
  generaliza su nombre: renombrar a `sortRanking(rows, mode)` y **mantener
  `sortHistoricRanking` como alias exportado** (`export const sortHistoricRanking = sortRanking;`)
  para no tocar la pantalla ni los tests de `f-006`. La pantalla de actividad
  usará `sortRanking`. (Si el implementer prefiere no renombrar, puede reutilizar
  directamente `sortHistoricRanking`; lo importante es no duplicar comparadores
  ni romper f-006.)

`RankingRow`, `RankingSortMode`, comparadores y `buildRanking` se reutilizan tal
cual. No se persiste ranking.

### `src/services/activityResults.ts` (extender)

Añadir la lectura del histórico de pruebas de una actividad (la parte "ver todas
sus pruebas con sus medallas", R2), que es una forma de fila distinta del ranking
y por eso vive junto a la lectura de `activity_results`:

- `listActivityHistory(activityId: string): Promise<ActivityHistoryEntry[]>`.
- Consultas (todas de lectura pública):
  - `activity_results` filtrado por `.eq('activity_id', activityId)`:
    `id, edition_id, participant_ids, played_at`.
  - `editions` (`id, year, label`) para resolver el año/etiqueta de cada prueba
    (puede reutilizar `listEditions()` o una consulta directa; el catálogo es
    pequeño).
  - `medal_awards` de esos `result_id` (`result_id, medal, person_ids`); si no
    hay pruebas, no se consulta.
  - `people` (`id, name`) para resolver los nombres de los ganadores.
- Forma de fila:
  ```ts
  interface ActivityHistoryMedal { medal: Medal; personNames: string[]; }
  interface ActivityHistoryEntry {
    resultId: string;
    editionId: string;
    editionYear: number;
    editionLabel: string | null;
    playedAt: string | null;
    participantCount: number;
    medals: ActivityHistoryMedal[]; // ordenadas oro, plata, bronce
  }
  ```
- Ordenar las entradas por `editionYear` desc y, dentro del mismo año, por
  `playedAt` desc (los `null` al final) — de la más reciente a la más antigua
  (R2.4). Dentro de cada prueba, ordenar `medals` en el orden fijo
  oro → plata → bronce.

## Pantallas

### `src/app/rankings/activities/index.tsx` — elegir actividad

Selector público de actividad (patrón espejo de `src/app/activities/index.tsx`
en su parte de lectura/búsqueda, **sin ningún control de escritura**):

- Carga el catálogo con `searchActivities('')` / `listActivities()` vía
  `useFocusEffect` (R4.3) y un buscador que llama a `searchActivities(query)`
  (o filtra en cliente, como hace `activities/index`) (R1.2).
- Cada fila (`ListRow`) navega a
  `router.push({ pathname: '/rankings/activities/[id]', params: { id } })` (R1.3).
- `EmptyState` cuando el catálogo está vacío (R1.4).

### `src/app/rankings/activities/[id].tsx` — histórico + clasificación

Detalle público de una actividad. Con `useLocalSearchParams<{ id }>` y
`useFocusEffect` carga en paralelo el nombre de la actividad (de
`listActivities()`/`searchActivities`), `listActivityHistory(id)` y
`listActivityRanking(id)`.

- Cabecera con el nombre de la actividad.
- Sección **Clasificación**: toggle "Por medallas" / "Por promedio" (idéntico a
  `rankings/historic.tsx`, reordenado en cliente con `sortRanking` vía `useMemo`,
  sin re-fetch, R3.6), y filas con `N. Nombre`, desglose
  `Oro x · Plata y · Bronce z`, total y a la derecha `participaciones · promedio`
  (dos decimales) — misma presentación que f-005/f-006. `EmptyState` si no hay
  filas.
- Sección **Histórico de pruebas**: una tarjeta/lista con cada
  `ActivityHistoryEntry` mostrando el año de la edición (y `label` si existe), el
  número de participantes (R2.3) y, por cada medalla, el color y los nombres de
  los ganadores (R2.2). Orden más reciente primero (R2.4). `EmptyState` "sin
  pruebas" si la actividad no se jugó nunca (R2.5).
- Ningún control de escritura (R4.2).

Registrar las rutas `rankings/activities/index` (título "Clasificación por
actividad") y `rankings/activities/[id]` (título "Clasificación") en
`src/app/_layout.tsx`, de forma aditiva junto a las rutas de rankings existentes.

### Home (`src/app/index.tsx`)

Convertir la `NavCard` placeholder "Clasificación por actividad" de la sección
"PRÓXIMAMENTE" en una `NavCard` pública activa en la sección **EXPLORAR** (junto
a las otras clasificaciones) que navega a `/rankings/activities/index`. Como esa
era la única tarjeta de "PRÓXIMAMENTE", retirar la sección vacía sin romper los
tests de Home existentes.

## Acceso y permisos

Vista de solo lectura, accesible sin sesión. No escribe nada: **sin migración ni
política RLS nueva** (R4.4) — se apoya en la lectura pública (`anon`) sobre
`activities`/`editions`/`activity_results`/`medal_awards`/`people` ya existente
desde `f-010`. No debe aparecer ningún control de escritura en ninguna de las dos
pantallas.

## Tests

- Servicio `rankings.ts` (ampliar `src/__tests__/services/rankings.test.ts` sin
  tocar las aserciones de f-005/f-006): `listActivityRanking` filtra por
  `.eq('activity_id', ...)`, agrega medallas/participaciones/promedio de varias
  ediciones de esa actividad, incluye participación sin medalla (promedio 0), y
  no consulta `medal_awards` si la actividad no tiene pruebas. Si se renombra a
  `sortRanking`, verificar que `sortHistoricRanking` sigue exportado y que sus
  tests siguen verdes.
- Servicio `activityResults.ts` (`src/__tests__/services/activityResults.test.ts`
  o uno nuevo `activityHistory`): `listActivityHistory` filtra por actividad,
  resuelve nombres de ganadores y año de edición, cuenta participantes, ordena de
  más reciente a más antigua, y ordena las medallas oro/plata/bronce. Caso sin
  pruebas: lista vacía y no consulta `medal_awards`.
- App: `src/__tests__/app/rankings-activities.test.tsx` (o dos archivos) — el
  selector lista/filtra actividades y navega al detalle; el detalle muestra el
  histórico (año, participantes, ganadores por color) y la clasificación
  (desglose/total/participaciones/promedio), el toggle reordena sin re-consultar
  el servicio (`toHaveBeenCalledTimes(1)`), no hay ningún control de escritura y
  hay estado vacío cuando procede.
- Verificar que los tests de f-005/f-006 (`rankings.test.ts`,
  `rankings-editions.test.tsx`, `rankings-historic.test.tsx`) siguen verdes sin
  modificarlos.

## Notas / desviaciones (a rellenar por implementer si aplica)

- Igual que f-006, no se implementa umbral mínimo de participaciones para el
  ranking por promedio (no es criterio de aceptación); se deja como nota futura.
- `listActivityHistory` corta antes de consultar `editions`/`people`/`medal_awards`
  cuando la actividad no tiene ninguna prueba (no solo `medal_awards`, R2.5):
  es una optimización adicional no contradictoria con el criterio de
  aceptación, que solo exige no consultar `medal_awards`.
- El detalle (`rankings/activities/[id].tsx`) resuelve el nombre de la
  actividad con `listActivities()` (igual que `rankings/editions/[id].tsx`
  hace con `listEditions()`), en vez de `searchActivities`, ya que solo
  necesita encontrar por `id` sobre el catálogo completo.
- Al activar la `NavCard` de "Clasificación por actividad" en EXPLORAR (Home)
  se retiró por completo la sección "PRÓXIMAMENTE" (quedaba vacía), tal y
  como indicaba el propio diseño.
- Los dos tests que fallaban previamente en el repo (`src/__tests__/app/activities/new.test.tsx`
  y `src/__tests__/app/results/new.test.tsx`, de f-003/f-004) son preexistentes
  y no están relacionados con f-007: no se tocaron sus pantallas ni sus tests
  en esta sesión.

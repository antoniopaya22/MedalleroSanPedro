# f-021-ranking-filters - Diseño

## Contexto de partida (verificado en código)

- `src/services/rankings.ts`: `listHistoricRanking()` sin parámetros agrega `activity_results`
  (sin filtro) + `medal_awards` (todos, vía `fetchAllAwards`) por `buildRanking`.
  `ActivityResultRankingRow` hoy es `{ id, participant_ids }` — **no** trae `edition_id`, aunque
  la tabla sí lo tiene (se usa como filtro `.eq('edition_id', ...)` en `fetchActivityResults`
  pero no se selecciona en el resultado).
- `rankings/historic.tsx`, `rankings/activities/[id].tsx` ya tienen el toggle "Por medallas"/
  "Por promedio" (`RankingSortMode`, `sortRanking`). `rankings/editions/[id].tsx` no tiene
  ningún control (confirmado leyendo el archivo).
- `src/app/(tabs)/people/index.tsx` no tiene ni buscador ni filtro; `listPeople()` ya devuelve
  ordenado por nombre (`order('name')`).
- `src/app/activities/index.tsx` (catálogo) ya tiene el patrón exacto de buscador por nombre
  (`TextField` + `useMemo` filtrando en cliente) — se reutiliza el mismo patrón para Participantes.
- `ActivityHistoryEntry` (en `activityResults.ts`, usado por `rankings/activities/[id].tsx`) ya
  trae `editionId`/`editionYear`/`editionLabel` por entrada — filtrar por edición es un `.filter`
  en cliente, cero queries nuevas.

## R1 — Rango de años en Clasificación histórica

### Servicio: `listHistoricRanking` acepta un rango opcional

```ts
export interface YearRange {
  fromYear?: number;
  toYear?: number;
}

export async function listHistoricRanking(yearRange?: YearRange): Promise<HistoricRankingRow[]>
```

Cambios:
1. `ActivityResultRankingRow` gana `edition_id: string`; `fetchActivityResults` selecciona
   `'id,participant_ids,edition_id'` (el campo extra no afecta a `listEditionRanking`/
   `listActivityRanking`, que ya filtran por ese mismo `edition_id`/`activity_id` en el `WHERE`,
   simplemente ahora también viaja en la fila).
2. `listHistoricRanking` pasa a pedir `activity_results` y `medal_awards` **en paralelo**
   (`Promise.all([fetchActivityResults(), fetchAllAwards()])` en vez de secuencial — pequeña
   mejora de latencia, sin cambio de comportamiento).
3. Si `yearRange` tiene `fromYear`/`toYear`, se resuelven los `edition_id` cuyo `year` cae en
   rango vía `listEditions()` (ya importado en otros servicios, mismo patrón que
   `activityResults.ts`) y se **filtran los `results` ya cargados en cliente** por ese conjunto
   de ids (`Set.has`, sin nueva query a `activity_results`).
4. Los `awards` (ya trae TODOS por `fetchAllAwards`, paginado) se filtran también en cliente por
   `resultIdSet` derivado de los `results` ya filtrados — **importante**: `buildRanking` no sabe
   nada de "rango de años", simplemente agrega lo que se le pase; si se filtran `results` pero
   se le siguen pasando TODOS los `awards`, contaría medallas de fuera de rango. Filtrar ambos
   con el mismo `resultIdSet` es lo que hace correcto el recorte (R1.3).
5. Si el rango no incluye ninguna edición, `results`/`awards` filtrados quedan `[]` y
   `buildRanking([], [])` ya devuelve `[]` de forma natural (R1.4, mismo camino que "sin
   resultados" ya cubierto por la pantalla).

No hace falta paginar la resolución de "qué ediciones caen en rango": `listEditions()` ya trae
todas (típicamente decenas, muy lejos del límite de 1000).

### UI: `rankings/historic.tsx`

Chips "Todas" / "Últimos 5 años" / "Últimos 10 años" (estado local `rangeMode`, por defecto
`'all'`). El año más reciente para calcular el rango sale de los datos ya cargados
(`Math.max(...editions.map(e => e.year))`, NO de `Date.now()`/`new Date()`): hace falta cargar
`listEditions()` además de `listHistoricRanking()` (`Promise.all`) solo para conocer ese máximo
y pasarlo como `yearRange` al servicio cuando cambia `rangeMode`. Cambiar de chip **sí** recarga
(`listHistoricRanking(yearRange)`), a diferencia del toggle "Por medallas"/"Por promedio" que es
puramente en cliente — son operaciones distintas (R1.3 exige recalcular agregación, no solo
reordenar). El toggle de orden sigue aplicándose en cliente sobre el resultado ya filtrado
(R1.5, sin cambios en `sortHistoricRanking`).

## R2 — Búsqueda y filtro en Participantes

`src/app/(tabs)/people/index.tsx`: mismo patrón que `activities/index.tsx` (`TextField` +
`useMemo`), más un segundo `useMemo`/filtro por estado:

```ts
const [query, setQuery] = useState('');
const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

const filtered = useMemo(() => {
  const term = query.trim().toLowerCase();
  return people.filter((person) => {
    const matchesStatus = statusFilter === 'all' || (statusFilter === 'active') === person.active;
    const matchesQuery = !term || person.name.toLowerCase().includes(term);
    return matchesStatus && matchesQuery;
  });
}, [people, query, statusFilter]);
```

Chips "Todos"/"Activos"/"Inactivos" (mismo componente visual que los toggles de orden ya usados
en otras pantallas: 3 `Button` en fila, `flex: 1`, `variant` primary/outline). Estado vacío nuevo
"Sin resultados" (R2.4) cuando `people.length > 0` pero `filtered.length === 0`, distinto del
`EmptyState` "Todavía no hay personas" (roster realmente vacío) — mismo patrón que
`activities/index.tsx` ya usa para su propio buscador.

## R3 — Toggle en Clasificación por edición

`src/app/(tabs)/rankings/editions/[id].tsx`: añadir `sortMode`/`sortRanking` exactamente como en
`rankings/historic.tsx`/`rankings/activities/[id].tsx` (mismos 2 `Button` en fila, mismo
`useMemo`). Sin cambios en el servicio (`listEditionRanking` ya devuelve `EditionRankingRow[]`,
que es un alias de `RankingRow` — `sortRanking` ya lo acepta tal cual).

## R4 — Filtro por edición en histórico de actividad

`src/app/(tabs)/rankings/activities/[id].tsx`: nuevo estado `selectedEditionId: string | null`
(`null` = "Todas"). Chips derivados de `history` ya cargado:

```ts
const editionOptions = useMemo(() => {
  const seen = new Map<string, { editionId: string; label: string }>();
  for (const entry of history) {
    if (!seen.has(entry.editionId)) {
      seen.set(entry.editionId, {
        editionId: entry.editionId,
        label: `${entry.editionYear}${entry.editionLabel ? ` · ${entry.editionLabel}` : ''}`,
      });
    }
  }
  return Array.from(seen.values()).sort((a, b) => b.editionId.localeCompare(a.editionId)); // orden estable; no crítico
}, [history]);

const filteredHistory = useMemo(
  () => (selectedEditionId ? history.filter((entry) => entry.editionId === selectedEditionId) : history),
  [history, selectedEditionId]
);
```

Chips en una fila horizontal con scroll (`ScrollView horizontal`) porque el número de ediciones
de una actividad puede crecer (a diferencia de los toggles de 2-3 opciones fijas de otras
pantallas): "Todas" + una chip por edición. Solo afecta a la sección "Histórico de pruebas"
(R4.3): la sección "Clasificación" (`sortedRanking`) no se toca.

## Casos borde

- **R1.4** (rango sin ediciones): cubierto arriba, mismo `EmptyState` ya existente.
- **R2.4** (búsqueda+filtro sin resultados): nuevo `EmptyState` "Sin resultados", ver R2.
- **R4** con una sola edición: 1 chip + "Todas" (2 en total), funciona igual.
- Ninguno de estos filtros depende de `canWrite` ni de sesión (R5.1): viven en las mismas
  pantallas de solo lectura ya públicas.

## Modelo de datos

Sin cambios de esquema ni RLS. `ActivityResultRankingRow` gana un campo (`edition_id`) ya
presente en la tabla, solo se empieza a seleccionar.

## Tests

- `rankings.ts`: tests de `listHistoricRanking(yearRange)` — filtra por rango, rango sin
  ediciones devuelve `[]`, sin rango se comporta igual que hoy (regresión).
- `rankings-historic.test.tsx`: chips de rango recargan con el `yearRange` correcto; toggle de
  orden sigue funcionando sobre el resultado filtrado.
- `people/index.tsx`: nuevo test de buscador + filtro de estado, combinados, y estado vacío de
  "sin resultados" distinto del de roster vacío.
- `rankings-editions.test.tsx`: toggle "Por puntos"/"Por promedio" nuevo en el detalle de edición.
- `rankings-activities.test.tsx`: chips de edición filtran el histórico sin refetch; la
  clasificación no cambia al filtrar.
- `npx tsc --noEmit` limpio y `npm test` en verde.

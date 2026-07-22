# f-020-edition-detail-tabs - Diseno

## Contexto de partida

`src/app/(tabs)/editions/[id]/index.tsx` (f-016) es hoy una pantalla de scroll unico:
cabecera (ano/label) + boton "Editar edicion" (solo `canWrite`) + `EditionRankingList`
(o `EmptyState` si no hay resultados) + FAB de alta (solo `canWrite`). Carga con
`Promise.all([listEditions(), listEditionRanking(id)])` dentro de un `useFocusEffect`.

Esta feature **no crea rutas nuevas** ni toca el layout de la pestana: reorganiza el
contenido de esa misma pantalla en dos pestanas internas y anade una funcion de servicio
para el historico de la edicion. El patron de pestanas a replicar ya existe, ya entregado,
en `src/app/(tabs)/people/[id]/index.tsx` (addendum de f-018): estado local `activeTab`,
una fila de `Button size="sm"` (variant `primary` para la activa, `outline` para el resto)
y render condicional del `View` de cada pestana. No se introduce ninguna libreria de tabs
ni un componente de tabs nuevo.

## 1. Servicio: nueva `listEditionHistory(editionId)` en `activityResults.ts`

Funcion NUEVA paralela a `listActivityHistory(activityId)`, pero centrada en una edicion:
filtra `activity_results` por `edition_id` (en vez de `activity_id`) y resuelve el nombre
de la **actividad** de cada prueba (en vez del ano de la edicion).

Tipo de retorno nuevo (paralelo a `ActivityHistoryEntry`, reutilizando `ActivityHistoryMedal`):

```ts
export interface EditionHistoryEntry {
  resultId: string;
  activityId: string;
  activityName: string;
  playedAt: string | null;
  participantCount: number;
  medals: ActivityHistoryMedal[]; // reutiliza el tipo ya existente
}
```

Implementacion (reutilizando al maximo la logica de `listActivityHistory`):

1. `supabase.from('activity_results').select('id,activity_id,participant_ids,played_at').eq('edition_id', editionId)`.
2. Si no hay resultados, devolver `[]` (no consultar `medal_awards`/`people`/`activities`), igual que `listActivityHistory` (R3.5 ⇒ estado vacio).
3. En paralelo (`Promise.all`): `listActivities()` (para el nombre de actividad),
   `supabase.from('medal_awards').select('result_id,medal,person_ids').in('result_id', resultIds)`,
   y `supabase.from('people').select('id,name')` (para los nombres de ganadores).
   - **Nota sobre `.in('result_id', resultIds)`:** aqui es seguro. `resultIds` son solo las
     pruebas de UNA edicion (decenas como mucho), no cientos como en el ranking historico o
     el historico de persona; no se acerca al limite de URL que motivo el fix `.contains(...)`
     en `rankings.ts`/`listPersonHistory`. Es el mismo `.in(...)` que ya usa `listActivityHistory`
     por prueba de una sola actividad. (Ver nota heredada de f-018 en `progress`.)
4. Resolver medallas por prueba con el MISMO patron que `listActivityHistory`: `MEDAL_DISPLAY_ORDER`
   (oro/plata/bronce) + `awardsByResultId` + `personNameById.get(id) ?? ''`.
5. Ordenar por `played_at` descendente con nulos al final (R3.3).

### Reutilizacion / evitar duplicar (convencion "2-3 usos")

La resolucion de `medals` (recorrer `MEDAL_DISPLAY_ORDER`, buscar el award de ese color,
mapear `person_ids` a nombres via `personNameById`) es identica en `listActivityHistory` y en
`listEditionHistory`. Al alcanzar 2 usos reales, el implementer **debe extraer** un helper
privado en `activityResults.ts`, p. ej.:

```ts
function resolveMedals(resultAwards: { medal: Medal; person_ids: string[] }[], personNameById: Map<string, string>): ActivityHistoryMedal[]
```

y usarlo desde ambas funciones, sin cambiar el comportamiento observable de `listActivityHistory`
(sus tests de f-007 deben seguir en verde intactos). Tambien se puede compartir el agrupado
`awardsByResultId`. NO se debe tocar la firma ni el orden de salida de `listActivityHistory`.

### Orden (R3.3): comparador propio, no `compareByEditionRecency`

`compareByEditionRecency` ordena primero por `editionYear` y luego por `playedAt`. Como aqui
todas las pruebas son de la misma edicion, el ano es constante y solo hay que ordenar por
`played_at` descendente con nulos al final. Opciones aceptables:
- Un comparador local pequeno solo-`playedAt` (preferido, mas claro que arrastrar un `editionYear` ficticio).
- Reutilizar `compareByEditionRecency` pasando un `editionYear` constante (funciona porque el
  primer criterio se anula), pero es menos legible; si se hace, documentarlo.

No hace falta ninguna consulta a `editions` en esta funcion (no se muestra el ano por prueba,
la cabecera de la pantalla ya lo tiene via `listEditions()`).

## 2. Pantalla `editions/[id]/index.tsx`: pestanas internas

Se modifica la pantalla existente (no se crean rutas). Cambios:

### Estado y carga
- Anadir `const [activeTab, setActiveTab] = useState<EditionTab>('ranking');` con
  `type EditionTab = 'ranking' | 'activities';` y `const EDITION_TABS = [{ key, label }]`
  (mismo patron que `DETAIL_TABS` en `people/[id]/index.tsx`).
- Anadir `const [history, setHistory] = useState<EditionHistoryEntry[]>([]);`.
- Anadir `const [sortMode, setSortMode] = useState<RankingSortMode>('medals');`.
- Ampliar el `Promise.all` de `loadDetail` a
  `Promise.all([listEditions(), listEditionRanking(id), listEditionHistory(id)])`
  y `setHistory(...)`. Una sola carga cubre ambas pestanas (R1.4); cambiar de pestana no
  dispara consultas (R1.2).
- `const sortedRanking = useMemo(() => sortRanking(ranking, sortMode), [ranking, sortMode]);`
  (mismo `useMemo` que `rankings/historic.tsx` / `rankings/activities/[id].tsx`). Declararlo
  antes de cualquier `return` condicional (regla de hooks), como en `people/[id]/index.tsx`.

### Layout (fuera de las pestanas, R4)
Se conservan tal cual, en el mismo sitio y con el mismo gating `canWrite`:
- Cabecera (ano + label opcional).
- Boton "Editar edicion" (solo `canWrite`).
- FAB de alta de resultado (`position: 'absolute'`, solo `canWrite`, navega con `params: { editionId: id }`).
- `notFound` (R5.3) y `ErrorBanner` con `onRetry` (R5.4) se mantienen igual.

### Fila de pestanas
Igual que `people/[id]/index.tsx`: una `View` con `flexDirection: 'row'` y un `Button size="sm"`
`fullWidth` por pestana, `variant` `primary`/`outline` segun `activeTab`. Colocada tras el boton
"Editar edicion", antes del contenido de la pestana.

### Pestana "Clasificacion" (`activeTab === 'ranking'`, R2)
- Si `ranking.length === 0`: `EmptyState` (icono `podium-outline`, mismo copy que hoy en f-016) (R2.4).
- Si hay filas: el toggle "Por puntos"/"Por promedio" (fila de 2 `Button` `fullWidth`, patron
  identico al de `rankings/historic.tsx`) + `<EditionRankingList ranking={sortedRanking} />`.
  - **Labels:** "Por puntos" y "Por promedio" (segun acceptance criteria de f-020), mapeando
    "Por puntos" -> `setSortMode('medals')` y "Por promedio" -> `setSortMode('average')`.
    Nota: las pantallas de f-006/f-007 rotulan ese mismo modo `medals` como "Por medallas";
    aqui el copy pedido es "Por puntos" (la lista muestra `score` en `pts`), sin cambiar el
    valor `RankingSortMode`.

### Pestana "Actividades" (`activeTab === 'activities'`, R3)
- Si `history.length === 0`: `EmptyState` (icono `time-outline`, copy tipo "Sin pruebas
  registradas" / "Cuando se registre una prueba en esta edicion, aparecera aqui") (R3.5).
- Si hay entradas: `Card` con una fila por `EditionHistoryEntry`, replicando el bloque de
  historico de `rankings/activities/[id].tsx` pero mostrando `entry.activityName` como titulo
  (en vez de `editionYear`), `{entry.participantCount} participantes` y el bloque de
  `entry.medals` (oro/plata/bronce con `MEDAL_COLOR`/`MEDAL_LABEL` y `personNames.join(', ')`).
  - `MEDAL_LABEL`/`MEDAL_COLOR` ya son constantes locales repetidas en varias pantallas
    (`people/[id]/index.tsx`, `rankings/activities/[id].tsx`); mantener el mismo enfoque
    (constante local) para no ampliar el alcance de esta feature con una extraccion transversal.

## 3. Estados vacios independientes (R2.4/R3.5)

Cada pestana evalua su propio dato (`ranking` vs `history`) y muestra su propio `EmptyState`.
En una edicion recien creada sin pruebas ambos estaran vacios, pero cada pestana lo comunica
por separado, sin una pestana rota ni un vacio compartido. `notFound` y `error` son de pantalla
(fuera de las pestanas) y tienen prioridad sobre el contenido de estas.

## 4. Servicios y modelo de datos

- Sin cambios de esquema ni de RLS. Solo lectura de tablas publicas ya existentes
  (`activity_results`, `medal_awards`, `people`, `activities`, `editions`).
- `listEditionRanking` y `sortRanking` se reutilizan sin cambios.
- Unica adicion de servicio: `listEditionHistory(editionId)` + tipo `EditionHistoryEntry`
  en `activityResults.ts`, mas el helper privado `resolveMedals` compartido con `listActivityHistory`.

## 5. `canWrite`

`canWrite = isAuthenticated && hasClaimedPerson`. Gating identico a f-016: solo afecta al
boton "Editar edicion" y al FAB (ambos fuera de las pestanas, R4). Las dos pestanas son
publicas (R5.1). La garantia real de escritura la da RLS (`editions_write_claimed_person`,
`activity_results`/`medal_awards`), esto es solo ocultado de UI.

## 6. Tests

- Servicio (`src/__tests__/services/activityResults.test.ts`): anadir cobertura de
  `listEditionHistory` — pruebas de una edicion con actividad/participantes/medallas resueltas
  con nombres de ganadores; orden por `played_at` descendente con nulos al final; edicion sin
  pruebas devuelve `[]` (y no consulta las tablas dependientes). Verificar que los tests
  existentes de `listActivityHistory` siguen en verde tras extraer `resolveMedals`.
- App detalle (`src/__tests__/app/...editions...`): las dos pestanas se renderizan y se alterna
  entre ellas; toggle "Por puntos"/"Por promedio" reordena la lista sin recargar; estados vacios
  independientes por pestana; boton "Editar edicion" y FAB visibles solo con `canWrite` e
  independientes de la pestana activa (caso anonimo/sin Person reclamada NO ve FAB accionable —
  requisito de permisos de `conventions.md`); edicion inexistente (`notFound`).
- `npx tsc --noEmit` limpio y `npm test` en verde.

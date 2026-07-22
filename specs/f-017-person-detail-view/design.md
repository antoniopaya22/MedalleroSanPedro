# f-017-person-detail-view - Diseno

## Contexto de partida (verificado en codigo)

Hoy `src/app/(tabs)/people/[id].tsx` **es** el formulario de edicion de una `Person`
(renombrar + alternar `active`), con guard `useEffect` que hace `router.replace('/people/index')`
si `!canWrite` y `return null` mientras — exactamente el mismo patron que tenia
`/editions/[id]` antes de f-016. El listado `src/app/(tabs)/people/index.tsx` solo navega
al `[id]` si `canWrite` (`onPress` condicional, `showChevron={canWrite}`), igual que estaba
`editions/index.tsx` antes de f-016.

Servicios ya existentes relevantes:
- `src/services/rankings.ts`: `listHistoricRanking()` construye, para TODAS las personas,
  la fila `RankingRow`/`HistoricRankingRow` (`gold/silver/bronze/total/score/participations/scorePerParticipation`)
  via el helper `buildRanking`. `buildRanking` **filtra** las filas con `participations === 0 && total === 0`,
  asi que una persona que nunca ha jugado NO aparece en el resultado.
- `src/services/activityResults.ts`: `listActivityHistory(activityId)` lista pruebas de una
  actividad con edicion + medallas resueltas (`ActivityHistoryEntry`/`ActivityHistoryMedal`). Es
  **por actividad**, no por persona, y su forma de medalla es "por color -> lista de ganadores",
  distinta de la que necesita esta feature ("la medalla de ESTA persona en la prueba").
- `src/app/results/new.tsx`: ya lee `editionId` de `useLocalSearchParams` (f-016) para
  preseleccionar edicion; filtra `people` a solo activas (`peopleList.filter((p) => p.active)`).

## 1. Estructura de rutas (Expo Router, carpetas anidadas) — igual que f-016

Se sustituye el archivo `[id].tsx` por una **carpeta** `[id]/`:

Layout final bajo `src/app/(tabs)/people/`:
- `index.tsx` — listado (ya existe; se modifica, ver seccion 7).
- `new.tsx` — alta de persona (sin cambios).
- `[id]/index.tsx` — **NUEVO**: vista de detalle publica (resumen + historico + FAB).
- `[id]/edit.tsx` — **MOVIDO**: el formulario que hoy vive en `[id].tsx` (contenido casi
  intacto; solo se ajusta el destino del `router.replace` del guard `!canWrite`).
- Se **elimina** `[id].tsx`.

`src/app/(tabs)/people/_layout.tsx`: reemplazar el `Stack.Screen name="[id]"` por dos entradas:
- `name="[id]/index"` con `title: 'Participante'`.
- `name="[id]/edit"` con `title: 'Editar persona'`.

Rutas de navegacion (mantener el objeto `{ pathname, params }` ya usado en el codigo):
- Listado -> detalle: `{ pathname: '/people/[id]', params: { id } }` (resuelve a `[id]/index`).
- Detalle -> editar: `{ pathname: '/people/[id]/edit', params: { id } }`.

## 2. Servicios: resumen de medallas de la persona

Decision: **NO** duplicar la agregacion. Se anade a `src/services/rankings.ts` una funcion
pequena que filtra el resultado de `listHistoricRanking()` por `personId`:

```ts
export async function listPersonSummary(personId: string): Promise<HistoricRankingRow | null> {
  const rows = await listHistoricRanking();
  return rows.find((row) => row.personId === personId) ?? null;
}
```

- Reutiliza `buildRanking` intacto (evita duplicar la logica de oro/plata/bronce/promedio, R1.4).
- Devuelve `null` cuando la persona no ha jugado ninguna prueba (recordar que `buildRanking`
  filtra las filas totalmente en cero). El detalle interpreta `null` como "resumen en ceros"
  (R5.1) y toma el nombre de la `Person` ya cargada (seccion 3), sin necesitar el nombre del row.
- Se prefiere una funcion nueva sobre anadir un parametro a `listHistoricRanking` para no
  cambiar la firma que ya consumen `rankings/historic.tsx` y sus tests.
- Coste: recalcula el historico completo (misma consulta que la pantalla historica). Es
  aceptable (mismo orden de magnitud que el resto de rankings) y mantiene una sola fuente de verdad.

## 3. Servicios: historico de pruebas de la persona

`listActivityHistory` es por actividad y su forma de medalla no encaja. Se anade a
`src/services/activityResults.ts` una funcion nueva **paralela** a `listActivityHistory`,
pero centrada en la persona:

```ts
export interface PersonHistoryEntry {
  resultId: string;
  editionId: string;
  editionYear: number;
  editionLabel: string | null;
  activityId: string;
  activityName: string;
  playedAt: string | null;
  medal: Medal | null; // null = participo sin medalla
}

export async function listPersonHistory(personId: string): Promise<PersonHistoryEntry[]>;
```

Implementacion (reutilizando el patron ya probado de `listActivityHistory`):
1. Consultar `activity_results` filtrando por participacion de la persona:
   `supabase.from('activity_results').select('id,edition_id,activity_id,played_at').contains('participant_ids', [personId])`.
   (`.contains` es el operador de contencion de array de PostgREST; devuelve solo las pruebas
   donde `personId` esta en `participant_ids`, resolviendo R1.5 sin traerse todo.)
2. Si no hay filas -> `return []` (R5.1), sin consultar mas tablas (igual que `listActivityHistory`).
3. En paralelo (`Promise.all`): `listEditions()`, `listActivities()`, y los `medal_awards` de
   esos `result_id` (`select('result_id,medal,person_ids').in('result_id', ids)`).
4. Para cada prueba, la **medalla de esta persona** = el `medal` del unico award de esa prueba
   cuyo `person_ids` incluye `personId`, o `null` si no aparece en ningun award (participo sin
   medalla). Nota: por invariante de dominio (una persona no recibe dos medallas en la misma
   prueba, garantizado en `createActivityResult`), como mucho hay un award con la persona por
   prueba. Esto es la forma "medalla de cada participante" adaptada; es mas simple que el
   `ActivityHistoryMedal` (lista de ganadores por color) de `listActivityHistory`, que aqui no
   aplica.
5. Resolver `editionYear`/`editionLabel` via `Map` por `edition_id` (patron de `listActivityHistory`)
   y `activityName` via `Map` por `activity_id`.
6. Ordenar por edicion descendente y, dentro del mismo ano, por `played_at` descendente con
   nulos al final (R1.6), reutilizando el mismo comparador que `listActivityHistory`.

Se mantiene alineado el tratamiento de paginacion: `listActivityHistory` hoy usa consultas
directas sin el helper `fetchAllRows` de `rankings.ts`; `listPersonHistory` seguira el mismo
estilo que `listActivityHistory` (una persona concreta tiene pocas pruebas, muy por debajo del
tope de 1000 filas). No se toca `rankings.ts::fetchAllRows`.

## 4. Pantalla de detalle `[id]/index.tsx`

Estructura analoga a `editions/[id]/index.tsx` (f-016) y a `rankings/activities/[id].tsx` (que
ya combina resumen + historico de pruebas):

- Estado: `person`, `notFound`, `summary: HistoricRankingRow | null`, `history: PersonHistoryEntry[]`,
  `loading`, `error`.
- Carga con `Promise.all([listPeople(), listPersonSummary(id), listPersonHistory(id)])` dentro de
  un `useFocusEffect` (R2.2). `person = list.find(id) ?? null`; `notFound = !person`.
- **Cabecera** (R1.2): `Text variant="display"` con el nombre; `Badge label="Inactiva"` si `!person.active`
  (mismo `Badge` que usa `people/index.tsx`).
- **Punto de entrada a editar** (R4.3): boton "Editar persona" (`variant="outline"`) visible solo
  si `canWrite`, navega a `{ pathname: '/people/[id]/edit', params: { id } }`.
- **Resumen de medallas** (R1.3): bloque de estadisticas con oro/plata/bronce, total, participaciones
  y promedio. Si `summary` es `null`, mostrar todo en `0` (`0.00` para el promedio). Este resumen es
  de UNA persona (una tarjeta de stats), forma distinta de la LISTA posicional que renderiza
  `EditionRankingList` (numeracion + "pts" por fila); **no** se reutiliza ese componente. Se renderiza
  inline en la pantalla. Por convencion (`docs/conventions.md`: extraer solo con 2-3 usos reales) NO
  se extrae un componente compartido con un unico uso; si el implementer prefiere un
  `PersonMedalSummary` local por legibilidad, es aceptable pero no obligatorio.
- **Historico de pruebas** (R1.5): `Card` con una fila por `PersonHistoryEntry`, cada una con
  edicion (`editionYear` + `editionLabel`), `activityName`, y la medalla de la persona (usar
  `MEDAL_LABEL`/`MEDAL_COLOR` como en `rankings/activities/[id].tsx`) o el texto "Participo sin
  medalla" cuando `medal === null`. `EmptyState` (icono `time-outline`) si `history.length === 0`
  (R5.1).
- **FAB** (seccion 5) y **casos borde** (seccion 6).

## 5. FAB de la pantalla de detalle (preseleccion de PARTICIPANTE)

Igual patron que el FAB local de f-016 (`editions/[id]/index.tsx`): `Pressable` con
`position: 'absolute'` abajo-derecha, gradiente + icono `add`, independiente del FAB global de
`AppTabBar` (que no se toca). Diferencias:

- Visible solo si `canWrite && person?.active` (R3.1/R3.4/R3.5). Se oculta para persona inactiva
  porque `results/new` solo lista participantes activos: preseleccionar a alguien inactivo seria un
  no-op confuso.
- Al pulsarlo:
  ```ts
  router.push({ pathname: '/results/new', params: { participantId: id } })
  ```
  Nombre del parametro: **`participantId`** (camelCase). Es un parametro nuevo; hoy `results/new.tsx`
  solo lee `editionId` (f-016). Se elige `participantId` para no colisionar con `editionId` y dejar
  claro que preselecciona a la persona como participante, no como edicion.

## 6. Cambios en `results/new.tsx` (preseleccion de participante, R3.3)

Cambio minimo, sin romper los flujos existentes (sin params, o con `editionId` de f-016):

- Leer tambien `participantId`:
  `const { editionId, participantId } = useLocalSearchParams<{ editionId?: string; participantId?: string }>();`
- Dentro del `.then` del `Promise.all` ya existente, tras
  `const activePeople = peopleList.filter((p) => p.active); setPeople(activePeople);`, anadir:
  `if (participantId && activePeople.some((p) => p.id === participantId)) { setParticipantIds([participantId]); }`.
  (Solo preselecciona si la persona esta entre las activas cargadas; una persona inactiva
  simplemente no se preselecciona, coherente con que el FAB no se muestra para inactivas.)
- Anadir `participantId` a las dependencias del `useEffect`.
- No tocar nada mas: la validacion "Selecciona al menos un participante" y la seleccion/medallas
  siguen igual.

## 7. Listado `index.tsx` (navegacion publica al detalle, R1.1)

Hoy el `ListRow` de cada persona solo navega si `canWrite` (`onPress` condicional,
`showChevron={canWrite}`). Cambiar para que **cualquier** usuario navegue al detalle:
`onPress` siempre navega a `{ pathname: '/people/[id]', params: { id: person.id } }` y
`showChevron` siempre `true`. El boton "Anadir persona" sigue condicionado a `canWrite`. El
`Badge "Inactiva"` de cada fila se mantiene.

## 8. `canWrite` (ocultar FAB/editar y bloquear `/people/[id]/edit`)

`canWrite = isAuthenticated && hasClaimedPerson` (de `src/context/AuthContext.tsx`).

- Detalle: FAB (con la condicion extra de `person.active`, R3.5) y boton "Editar persona" (R4.3)
  se renderizan solo si `canWrite`. La vista en si es publica (R2.1).
- `[id]/edit.tsx`: conserva el guard del actual `[id].tsx` (`useEffect` con `router.replace(...)`
  si `!canWrite`, y `return null` mientras). Ajustar el destino del `replace`: hoy apunta a
  `'/people/index'`; redirigir a la vista de detalle `{ pathname: '/people/[id]', params: { id } }`
  es mas coherente ahora que existe el detalle (igual criterio que `editions/[id]/edit.tsx`). La
  garantia real de permiso es la politica RLS `people_write_claimed_person`, no este ocultado de UI.

## 9. Casos borde

- **Persona sin pruebas (R5.1):** `listPersonSummary` -> `null` (resumen en ceros) y
  `listPersonHistory` -> `[]` (`EmptyState`). Cabecera visible; FAB visible si `canWrite && active`.
- **Persona inexistente (R5.2):** `listPeople().find(id)` -> `undefined`; mostrar mensaje "No se ha
  encontrado esa persona" (igual patron que el actual `[id].tsx` y que `editions/[id]/index.tsx`).
  Sin FAB ni boton de editar.
- **Persona inactiva (R5.3):** se muestra detalle + historico completos; solo cambia que el FAB no
  aparece (R3.5). Decision documentada: el historico es un hecho del pasado y no se oculta por que
  la persona ya no este activa.
- **Error de carga (R5.4):** `ErrorBanner` con `onRetry` (mismo patron que el resto de pantallas).

## 10. Modelo de datos

Sin cambios de esquema. Solo lectura de tablas publicas ya existentes (`people`, `editions`,
`activities`, `activity_results`, `medal_awards`) via los servicios actuales/ampliados. No se
toca RLS. La escritura sigue guardada por las politicas `*_write_claimed_person` y validada en
`createActivityResult` (invariante de una sola medalla por persona y prueba).

## 11. Tests

- Servicio `rankings.ts`: test de `listPersonSummary` (persona con medallas -> su fila; persona sin
  participaciones -> `null`), mockeando la misma capa que ya usa `rankings.test.ts`.
- Servicio `activityResults.ts`: test de `listPersonHistory` (medalla propia resuelta por prueba;
  participacion sin medalla -> `medal: null`; persona sin pruebas -> `[]`; orden reciente-primero).
- App detalle (`src/__tests__/app/people-id.test.tsx`, mismo estilo que `editions-id.test.tsx`):
  render con resumen + historico; resumen en ceros + historico vacio (persona sin pruebas); persona
  inexistente; persona inactiva (Badge "Inactiva", sin FAB aunque `canWrite`); FAB visible solo con
  `canWrite` y persona activa (anonimo/sin Person reclamada NO ve FAB).
- App `results/new`: preseleccion de participante cuando llega `participantId` (persona activa), que
  una persona inactiva no se preselecciona, y que sin parametro (o solo con `editionId`) arranca
  igual que hoy.
- App `[id]/edit`: acceso bloqueado (redirige a `/people/[id]`) sin `canWrite`.
- `npx tsc --noEmit` limpio y `npm test` en verde.

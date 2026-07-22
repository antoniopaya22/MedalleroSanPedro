# f-016-edition-detail-view - Diseno

## Contexto de partida

Hoy `src/app/(tabs)/editions/[id].tsx` **es** el formulario de edicion de metadatos
(ano/label/fechas), y solo se navega a el si `canWrite` (ver `(tabs)/editions/index.tsx`,
que condiciona `onPress`/`showChevron` a `canWrite`). El ranking de edicion ya existe,
publico, en `src/app/(tabs)/rankings/editions/[id].tsx`, calculado por
`listEditionRanking(editionId)` de `src/services/rankings.ts`.

## 1. Estructura de rutas (Expo Router, carpetas anidadas)

En Expo Router, para tener a la vez `/editions/[id]` y `/editions/[id]/edit` se
sustituye el archivo `[id].tsx` por una **carpeta** `[id]/`:

Layout final bajo `src/app/(tabs)/editions/`:

- `index.tsx` — listado (ya existe; se modifica, ver seccion 5).
- `new.tsx` — alta de edicion (sin cambios).
- `[id]/index.tsx` — **NUEVO**: vista de detalle publica (participantes + clasificacion + FAB).
- `[id]/edit.tsx` — **MOVIDO**: el formulario que hoy vive en `[id].tsx` (contenido casi intacto).
- Se **elimina** `[id].tsx`.

`_layout.tsx` de la pestana: reemplazar el `Stack.Screen name="[id]"` por dos entradas:
- `name="[id]/index"` con `title` tipo "Edicion" / titulo dinamico del ano.
- `name="[id]/edit"` con `title: 'Editar edicion'`.

Rutas de navegacion (mantener el objeto `{ pathname, params }` que ya usa el resto del codigo):
- Listado -> detalle: `{ pathname: '/editions/[id]', params: { id } }`.
- Detalle -> editar: `{ pathname: '/editions/[id]/edit', params: { id } }`.

## 2. Servicios: reutilizar `listEditionRanking`, sin funcion nueva

El tipo `RankingRow` (en `rankings.ts`) ya trae `personId`, `personName`, `gold`,
`silver`, `bronze`, `total`, `score`, `participations`, `scorePerParticipation`.
Ademas `buildRanking` ya **filtra** a las filas con `participations > 0 || total > 0`.

Decision: **la lista de participantes ES el resultado de `listEditionRanking(editionId)`.**
Cada `RankingRow` devuelta corresponde a una persona con al menos una participacion (o
medalla) en la edicion, con su desglose y promedio ya calculados. No se anade ninguna
funcion a `activityResults.ts` ni a `rankings.ts`; hacerlo duplicaria la agregacion que
`buildRanking` ya hace. `listActivityHistory(activityId)` de `activityResults.ts` es por
actividad y no aplica aqui.

Para la cabecera se sigue el patron ya usado en el ranking de edicion: `listEditions()`
y `find(id)` (mismo enfoque que `rankings/editions/[id].tsx` y `people/[id]`), evitando
un `getEdition` de un solo uso.

## 3. Pantalla de detalle `[id]/index.tsx`

Estructura casi identica a `(tabs)/rankings/editions/[id].tsx` (misma carga con
`Promise.all([listEditions(), listEditionRanking(id)])`, mismo `useFocusEffect`, mismo
render de cabecera + `Card`/`ListRow` con desglose/pts/promedio, mismo `EmptyState` para
edicion sin resultados). Diferencias:

- Titulo/cabecera de "detalle de edicion" (ano + label) en vez de "Clasificacion {ano}".
- Caso `id` inexistente (R5.2): tras cargar, si no se encuentra la edicion, mostrar
  mensaje "No se ha encontrado esa edicion" (igual patron que el actual `[id].tsx`), en
  vez de asumir que existe.
- FAB propio (seccion 4) y acceso a edicion (seccion 6).

Reutilizacion de UI: ahora hay 2 usos del mismo bloque de render de ranking (este detalle
y `rankings/editions/[id].tsx`). Conforme a `docs/conventions.md` (extraer solo con 2-3
usos reales), el implementer PUEDE extraer un componente presentacional compartido
(p. ej. `EditionRankingList`) o duplicar el bloque; se deja a su criterio, pero si duplica
debe mantener ambos coherentes. Preferencia: componente presentacional compartido, ya que
se alcanza el umbral de 2 usos.

## 4. FAB de la pantalla de detalle vs FAB global de `AppTabBar`

`AppTabBar` (`src/components/navigation/AppTabBar.tsx`) ya tiene un FAB central que va a
`/results/new` **sin** edicion preseleccionada (o a `/sign-in` si no `canWrite`). Ese FAB
global se mantiene tal cual (es de la barra de tabs, no de esta pantalla).

Decision: la vista de detalle tiene su **propio** FAB local (superpuesto, `position:
'absolute'` abajo-derecha dentro del `Screen`), **independiente** del de la tab bar,
visible solo si `canWrite` (R3.1/R3.4). Al pulsarlo navega a `/results/new` con la edicion
preseleccionada:

```
router.push({ pathname: '/results/new', params: { editionId: id } })
```

Nombre del parametro: `editionId` (camelCase, coincide con el estado `selectedEditionId`
del formulario y con el nombre de campo del dominio). Es un parametro nuevo: hoy
`src/app/results/new.tsx` NO lee ningun parametro de ruta (inicializa `selectedEditionId`
a `''`). No existe convencion previa que respetar para este caso, asi que se fija
`editionId` aqui.

## 5. Cambios en `results/new.tsx` (preseleccion de edicion, R3.3)

- Leer `const { editionId } = useLocalSearchParams<{ editionId?: string }>();`.
- Tras cargar las ediciones (dentro del `.then` del `Promise.all` existente), si llega
  `editionId` y coincide con una edicion cargada, hacer `setSelectedEditionId(editionId)`.
- No cambiar nada mas del flujo: sin `editionId`, el formulario arranca igual que hoy
  (edicion sin seleccionar). No romper la validacion "Elige una edicion".

## 6. `canWrite` (ocultar FAB y bloquear `/editions/[id]/edit`)

`canWrite = isAuthenticated && hasClaimedPerson` (de `src/context/AuthContext.tsx`).

- Detalle: el FAB y el punto de entrada a "Editar edicion" (R4.3) se renderizan solo si
  `canWrite`. La vista en si es publica (R2.1).
- `[id]/edit.tsx`: conserva el guard existente del actual `[id].tsx` (`useEffect` que hace
  `router.replace(...)` si `!canWrite`, y `return null` mientras) como defensa en
  profundidad. Ajustar el destino del `replace`: hoy apunta a `'/editions/index'`;
  redirigir a la vista de detalle `{ pathname: '/editions/[id]', params: { id } }` (o al
  listado `/editions`) es mas coherente ahora que existe el detalle. La garantia real de
  permiso es la politica RLS `editions_write_claimed_person`, no este ocultado de UI.

## 7. Listado `index.tsx` (navegacion publica al detalle, R1.1)

Hoy el `ListRow` de cada edicion solo navega si `canWrite` (`onPress` condicional,
`showChevron={canWrite}`). Cambiar para que **cualquier** usuario navegue al detalle:
`onPress` siempre navega a `{ pathname: '/editions/[id]', params: { id } }` y
`showChevron` siempre `true`. El boton "Anadir edicion" sigue condicionado a `canWrite`.

## 8. Casos borde

- **Edicion sin resultados (R5.1):** `listEditionRanking` devuelve `[]`; mostrar
  `EmptyState` (icono `podium-outline`), manteniendo cabecera y FAB (si `canWrite`).
- **Edicion inexistente (R5.2):** `find(id)` devuelve `undefined`; mostrar mensaje de no
  encontrada. No mostrar FAB de "registrar resultado" para un id que no existe.
- **Error de carga (R5.3):** `ErrorBanner` con `onRetry` (mismo patron que el resto).

## 9. Modelo de datos

Sin cambios de esquema. Solo lectura de tablas publicas ya existentes (`editions`,
`people`, `activity_results`, `medal_awards`) via los servicios actuales. No se toca RLS.

## Tests

- Servicio: ningun cambio de logica; `listEditionRanking` ya cubierto por
  `rankings.test.ts` (agregacion, participacion sin medalla, edicion vacia). No se anade
  servicio nuevo, asi que no hay test de servicio nuevo salvo que se extraiga un helper.
- App detalle: render con participantes+clasificacion; estado vacio (edicion sin
  resultados); edicion inexistente; FAB visible solo con `canWrite` (caso anonimo/sin
  Person reclamada NO ve FAB accionable — requisito de permisos de `conventions.md`).
- App `results/new`: preseleccion de edicion cuando llega `editionId` por parametro, y que
  sin parametro arranca sin edicion seleccionada.
- App `[id]/edit`: acceso bloqueado (redirige) sin `canWrite`.
- `npx tsc --noEmit` limpio y `npm test` en verde.

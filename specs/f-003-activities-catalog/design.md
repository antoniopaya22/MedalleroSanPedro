# f-003-activities-catalog — Diseño

## Resumen

Catálogo de actividades sobre infraestructura **casi toda ya existente**: la
tabla `activities`, sus políticas RLS `activities_select_public` y
`activities_write_claimed_person` (f-010) ya cubren lectura pública y escritura
restringida a `Person` reclamada. El tipo `Activity` (`id, name, createdAt`) ya
está en `src/types/domain.ts`. f-003 añade: una **migración pequeña** (índice
único case-insensitive sobre `name`, para el anti-duplicado que es el propósito
de la feature), una capa de servicios `src/services/activities.ts`, tres
pantallas de Expo Router bajo `src/app/activities/` y sus tests.

Se sigue el patrón ya establecido y revisado en `src/services/editions.ts` /
`src/services/people.ts` y en las pantallas `src/app/people/*`, adaptándolo a
`Activity`.

## Decisiones técnicas

### 1. Migración: índice único case-insensitive sobre `activities(lower(name))`

- **Motivo**: el valor central de f-003 (criterio de aceptación 2 y descripción)
  es *no crear duplicados*. La forma robusta de garantizarlo —no solo con una
  comprobación de UI que sufre carreras— es un índice único a nivel de BBDD. Se
  reutiliza el patrón ya probado de `editions` (constraint `unique(year)` +
  error tipado `EditionYearTakenError` + traducción del código `23505`).
- **Migración nueva**: `supabase/migrations/20260720190000_activities_unique_name.sql`
  con:
  ```sql
  create unique index if not exists activities_name_lower_key
    on public.activities (lower(name));
  ```
  Es seguro: el catálogo está vacío (la importación del histórico es f-008, aún
  no ejecutada), así que no hay filas que violen el índice al crearlo. Sin
  cambios en RLS ni en columnas.
- **No unicidad exacta, sino case-insensitive**: `lower(name)` cubre "Fútbol"
  vs "fútbol". No normaliza tildes ni erratas (p. ej. "fronton" vs "Frontón");
  esa normalización semántica es de f-008. f-003 solo bloquea duplicados
  triviales por mayúsculas/espacios creados desde la app.
- **Red para f-008**: este índice también protege a la importación de crear dos
  filas que difieran solo en mayúsculas; f-008 conserva la lógica de dedupe
  semántica más amplia.

### 2. Servicios (`src/services/activities.ts` — archivo nuevo)

Espeja `editions.ts`: `interface ActivityRow { id; name; created_at }`,
`mapRow`, y un error tipado. Exporta:

- `ActivityNameTakenError extends Error` — mensaje "Ya existe una actividad con
  ese nombre." Reconocible por la UI (R1.5/R3.3). Se lanza al traducir el código
  `23505` de la violación del índice único.
- `listActivities(): Promise<Activity[]>` — `from('activities').select('*').order('name')`
  (R4.1/R4.2). Mapea con `mapRow`; lanza en error.
- `searchActivities(query: string): Promise<Activity[]>` — primitivo de búsqueda
  reutilizable (R2.1, y consumido por f-004). Si `query.trim()` está vacío,
  delega en `listActivities()` (R2.2). Si no, `from('activities').select('*')
  .ilike('name', \`%${term}%\`).order('name')` (`ilike` = coincidencia
  case-insensitive de Postgres). Mapea; lanza en error. Para escapar `%`/`_` del
  término del usuario no se complica: el catálogo es pequeño y familiar; se pasa
  el término recortado tal cual dentro de `%...%` (documentar como aceptable, no
  es una superficie de inyección: es una query parametrizada de PostgREST).
- `createActivity(name: string): Promise<Activity>` — `insert({ name: name.trim() })
  .select('*').single()` (R1.2). Traduce `23505` a `ActivityNameTakenError`
  (R1.5). La validación de no-vacío vive en la pantalla (R1.3); aquí solo
  `trim()`.
- `updateActivity(id: string, name: string): Promise<Activity>` — renombrado
  (R3.1). `update({ name: name.trim() }).eq('id', id).select('*').single()`.
  Traduce `23505` a `ActivityNameTakenError` (R3.3). (No hay más campos que
  editar en `Activity`; firma simple `name: string`, no un objeto `changes`,
  porque solo se puede cambiar el nombre — sin abstracción prematura.)

Mapeo snake_case↔camelCase con `mapRow` local, sin capa genérica (conforme a
`docs/conventions.md`).

### 3. Pantallas (Expo Router, `src/app/activities/`)

Nueva carpeta `src/app/activities/`. Copy en español; identificadores en inglés.
Patrón de `src/app/people/*`.

- **`src/app/activities/index.tsx`** — catálogo + buscador (R2, R4, R5).
  - `useAuth()` → `canWrite`. Estado `activities`, `loading`, `error`, y `query`.
  - Un `TextField` de búsqueda (label/placeholder "Buscar actividad") siempre
    visible (para todos, R5.3). Al cambiar `query` se recarga con
    `searchActivities(query)` (R2.1/R2.2). Se puede aplicar un pequeño debounce
    o recargar en cada cambio; el catálogo es pequeño, cualquiera de las dos es
    aceptable — elegir la más simple que no dispare una query por tecla de forma
    problemática (p. ej. `useEffect` sobre `query` con un pequeño `setTimeout`
    de ~250ms, o recarga directa). Alternativa igualmente válida: cargar todo
    con `listActivities()` una vez y filtrar en cliente por `query`
    (case-insensitive) — más simple y sin latencia, dado el tamaño. **Preferir
    filtrado en cliente en la pantalla** y mantener `searchActivities` en el
    servicio como primitivo tead para f-004 (queda cubierto por test de servicio
    aunque la pantalla filtre en cliente; documentarlo). Si se filtra en
    cliente, la pantalla usa `listActivities()` + filtro local.
  - Si `canWrite`, botón "Añadir actividad" → `/activities/new`, y cada
    `ListRow` es pulsable → `/activities/[id]` (edición). Si `!canWrite`, filas
    no accionables y sin botón de alta (R5.1/R5.2).
  - `Card` + `ListRow` (title = `activity.name`) + `Divider` entre filas, patrón
    de `people/index.tsx`.
  - `EmptyState` cuando el catálogo está vacío. Cuando hay `query` pero ninguna
    coincidencia, un `EmptyState`/`Text` de "Sin resultados para «query»".
  - Recarga al enfocar con `useFocusEffect` (para reflejar altas/ediciones al
    volver de `new`/`[id]`), patrón de `people/index.tsx`.
- **`src/app/activities/new.tsx`** — alta (R1, R2.3).
  - Guarda de escritura: si `!canWrite`, `router.replace('/activities/index')`
    (defensa en profundidad junto a RLS), patrón de `people/new.tsx`.
  - `TextField` "Nombre" + `Button` "Crear". Validación no-vacío/solo-espacios →
    `error` en el `TextField`, sin llamar al servicio (R1.3).
  - **Coincidencias en vivo (R2.3)**: al escribir, mostrar debajo las
    actividades existentes cuyo nombre contenga el texto (usando el mismo
    `listActivities()` cargado al montar + filtro en cliente, o
    `searchActivities`). Cada coincidencia es informativa/seleccionable e invita
    a reutilizar en vez de crear. Mantenerlo simple: una lista de coincidencias
    con un texto "Ya existe algo parecido, ¿querías esta?" cuando las hay.
  - En éxito, `createActivity(name)` y `router.back()`. Si el servicio lanza
    `ActivityNameTakenError`, mostrar su mensaje como error de nombre (R1.5,
    complementa la ayuda de coincidencias por si hay carrera). Otros errores →
    mensaje genérico (R1.4). Estado `loading` en el botón.
- **`src/app/activities/[id].tsx`** — renombrado (R3).
  - Guarda de escritura como en `new.tsx`.
  - Carga la actividad filtrando de `listActivities()` por `id`
    (`useLocalSearchParams`), patrón de `people/[id].tsx` (evita un servicio
    `getActivity` de un solo uso). Estados `loading`/no encontrada.
  - `TextField` de nombre prellenado + `Button` "Guardar". Validación no-vacío
    (R3.2). En éxito `updateActivity(id, name)`. `ActivityNameTakenError` →
    mensaje de nombre (R3.3); otros errores → genérico.

### 4. Registro de rutas (`src/app/_layout.tsx`) — edición ADITIVA

**Importante (trabajo en paralelo)**: `_layout.tsx` ya contiene en disco las
rutas de `people/*` y de `editions/*` (f-002 en curso en otra sesión). **Releer
el archivo justo antes de editar** y **añadir** las tres líneas de `activities/*`
sin tocar ni reordenar las de `people`/`editions`:

```tsx
<Stack.Screen name="activities/index" options={{ title: 'Actividades' }} />
<Stack.Screen name="activities/new" options={{ title: 'Nueva actividad', presentation: 'modal' }} />
<Stack.Screen name="activities/[id]" options={{ title: 'Editar actividad' }} />
```

`AuthGate` no cambia: la lectura del catálogo es pública; el gating de escritura
es por `canWrite` dentro de las pantallas.

### 5. Punto de entrada (`src/app/index.tsx`) — edición ADITIVA

`index.tsx` ya tiene tarjetas "Personas" y "Ediciones" (esta última de f-002).
**Releer antes de editar** y **añadir** una `Card` "Actividades" con un `Button`
"Ver actividades" → `router.push('/activities/index')`, siguiendo exactamente el
patrón de las tarjetas existentes. Visible para todos (catálogo público). No
tocar las tarjetas existentes ni la tarjeta de cuenta / `SignInPrompt`.

## Modelo de datos

No cambia el tipo `Activity` (`id, name, createdAt`). Única adición de esquema: el
índice único case-insensitive de la decisión 1. Sin columnas nuevas.

## Estrategia de test

Sin BBDD real; mock de `@/services/supabase`, patrón de `people.test.ts` /
`editions.test.ts` (mocks encadenados `from().select().order()`,
`from().select().ilike().order()`, `insert().select().single()`,
`update().eq().select().single()`).

- **`src/__tests__/services/activities.test.ts`** (nuevo):
  - `listActivities` → `from('activities').select('*').order('name')`, mapea
    filas a `Activity`; lanza en error.
  - `searchActivities('cat')` → `select('*').ilike('name', '%cat%').order('name')`;
    y con query vacía/espacios delega en el camino de `listActivities` (sin
    `ilike`). Mapea; lanza en error.
  - `createActivity` inserta `{ name }` con `trim`; devuelve la `Activity`
    mapeada; traduce el error `code: '23505'` a `ActivityNameTakenError`; propaga
    otros errores.
  - `updateActivity` envía `{ name }` con `trim` y `.eq('id', id)`; devuelve la
    `Activity` mapeada; traduce `23505` a `ActivityNameTakenError`.
- **`src/__tests__/app/activities/index.test.tsx`** (gating de UI + búsqueda,
  criterio de aceptación 3 lado UI, exigido por `docs/conventions.md`):
  - `canWrite=false` (mock de `@/context/AuthContext`) NO renderiza "Añadir
    actividad" y las filas no son accionables; el buscador y la lista sí se ven.
  - `canWrite=true` sí renderiza "Añadir actividad".
  - Al escribir en el buscador se filtra el catálogo (al menos un caso que
    verifique que un término deja solo las coincidencias). Mock de
    `@/services/activities` (`listActivities`/`searchActivities` según lo que use
    la pantalla). Recordatorio RNTL 14: `await render(...)`, y `fireEvent.*`
    también es asíncrono → `await fireEvent.changeText(...)`.
- **`src/__tests__/app/activities/new.test.tsx`** (guarda de escritura +
  validación + anti-duplicado UI):
  - `canWrite=false` no muestra el formulario y redirige a `/activities/index`;
    `canWrite=true` sí muestra `TextField`/botón "Crear".
  - Nombre vacío no llama a `createActivity` y muestra validación; nombre válido
    sí llama a `createActivity` con el nombre.
  - Un caso donde `createActivity` rechaza con `ActivityNameTakenError` y la
    pantalla muestra el mensaje de duplicado (R1.5). Mock de
    `@/context/AuthContext`, `@/services/activities` y `expo-router`.
- **RLS**: no se ejecuta Postgres en CI. La restricción de escritura es la
  política `activities_write_claimed_person` ya existente y verificada
  manualmente en el flujo de f-011. f-003 añade una nota en `supabase/README.md`
  señalando que el alta y el renombrado de `activities` quedan cubiertos por ese
  mismo escenario (usuario sin `Person`/`anon` no puede `INSERT`/`UPDATE` en
  `activities`), y documenta la verificación manual de la migración del índice
  único.

## Riesgos / notas

- **Edición aditiva de `_layout.tsx` e `index.tsx`**: son compartidos con f-002
  (en curso en paralelo). Releer en el momento de editar y usar ediciones
  precisas y aditivas; nunca reescribir el archivo entero ni reordenar bloques
  de otras features.
- **Rutas tipadas de expo-router** (`experiments.typedRoutes: true`, ver
  desviación documentada en `specs/f-001-people-management/design.md`): usar el
  literal `/activities/index` para volver al catálogo y la forma de objeto
  `router.push({ pathname: '/activities/[id]', params: { id } })` para navegar a
  la edición. No usar plantillas de string tipo `` `/activities/${id}` ``.
- **Reconfigurar mocks encadenados** para cubrir `ilike` en el nuevo
  `activities.test.ts` (el `select` de búsqueda encadena `.ilike().order()`).
- **`updateActivity` nunca debe tocar más que `name`**: no hay más campos
  mutables en `Activity`.

## Desviaciones respecto al diseño (documentadas durante la implementación)

- **`src/app/index.tsx` ya tenía una `NavCard` "Actividades" placeholder**
  (sección "PRÓXIMAMENTE", `comingSoonLabel="Pronto"`, sin `onPress`), no
  contemplada explícitamente en la sección 5 de este documento (que asumía
  "añadir una tarjeta nueva"). Añadir una segunda tarjeta "Actividades"
  habría duplicado la entrada. En vez de eso se activó la tarjeta existente:
  se movió de la sección "PRÓXIMAMENTE" a "EXPLORAR" (junto a "Ediciones" y
  "Personas") y se le añadió `onPress={() => router.push('/activities/index')}`,
  quitando `comingSoonLabel`. La tarjeta "Clasificaciones" de "PRÓXIMAMENTE"
  no se tocó. Sigue el mismo componente `NavCard` y el mismo patrón visual que
  las tarjetas ya activas; no se introdujo el patrón `Card`+`Button` que
  sugería el texto original de esta sección, porque `index.tsx` ya usaba
  `NavCard` de forma consistente para todas sus entradas.

# f-001-people-management — Diseño

## Resumen

Gestión del roster de personas sobre infraestructura **ya existente**: la tabla
`people`, su política de escritura RLS `people_write_claimed_person` (f-010) y el
trigger `protect_person_claim` (f-011) ya cubren toda la seguridad de servidor. f-001
**no añade ni modifica esquema ni políticas RLS**; solo añade capa de servicios, tres
pantallas de Expo Router y sus tests. La distinción activa/inactiva ya vive en la
columna `people.active` y en el tipo `Person` de `src/types/domain.ts`.

## Decisiones técnicas

### 1. Sin nueva migración SQL (seguridad ya cubierta)

- **Lectura pública**: la política `people_select_public` (f-010) ya permite a `anon`
  y `authenticated` leer todo el roster (R4.1).
- **Escritura restringida**: la política `people_write_claimed_person` (f-010,
  `for all ... using/with check has_claimed_person()`) ya garantiza que solo un
  autenticado con `Person` reclamada puede `INSERT`/`UPDATE` sobre `people` (R5.1,
  R5.2, R5.4). No hace falta política nueva.
- **No tocar `claimed_by_user_id`** (R2.4): el trigger `protect_person_claim` (f-011)
  ya lanza excepción si un `UPDATE` general de `people` intenta cambiar esa columna
  (el flag `app.claiming` solo lo activa la RPC `claim_person`). Los servicios de f-001
  nunca envían `claimed_by_user_id` en sus `UPDATE`, así que el `UPDATE` de nombre o de
  `active` pasa el trigger sin problema. Esto es una razón adicional para **no** exponer
  un servicio genérico que acepte columnas arbitrarias.
- **Baja lógica, no borrado** (R2.1, R2.3): no se implementa `DELETE`. Marcar inactiva
  es un `UPDATE active = false`, que preserva la fila y su histórico (`activity_results`
  y `medal_awards` referencian a la persona por `uuid[]` sin FK, de modo que un borrado
  físico dejaría ids colgantes en el histórico; la baja lógica lo evita). La política
  RLS `for all` técnicamente permitiría `DELETE` a nivel de BBDD, pero la app no ofrece
  esa ruta.

> Consecuencia: el criterio de aceptación 3 (anónimo / sin `Person` no escribe) ya está
> garantizado por RLS. Se documenta la verificación manual en `supabase/README.md`
> reutilizando el escenario de f-011 (usuario sin `Person` no puede escribir en ninguna
> tabla de dominio), añadiendo una nota específica de `people` (alta + marcar inactiva).

### 2. Servicios (`src/services/people.ts` — extender el existente)

El archivo ya tiene `listClaimablePeople`, `claimPerson`, `PersonAlreadyClaimedError`,
la interfaz `PersonRow` y el helper `mapRow`. Se **reutilizan** `PersonRow`/`mapRow`; se
añaden:

- `listPeople(): Promise<Person[]>` — `select('*').order('name')` sobre `people` (todo
  el roster, activas e inactivas, R4.1/R4.3). Mapea con `mapRow`. Lanza en error.
- `createPerson(name: string): Promise<Person>` — `insert({ name })` (la columna
  `active` toma su default `true`; `claimed_by_user_id` queda `null`), con
  `.select('*').single()`; devuelve la `Person` mapeada (R1.2). Hace `name.trim()` antes
  de insertar y asume que la UI ya validó no-vacío (defensa en profundidad: la validación
  de negocio real vive en la pantalla, R1.3).
- `updatePerson(id: string, changes: { name?: string; active?: boolean }): Promise<Person>`
  — construye el payload solo con las claves presentes en `changes` (nunca
  `claimed_by_user_id`), `update(payload).eq('id', id).select('*').single()`; devuelve la
  `Person` mapeada. Cubre renombrar (R3.1) y marcar activa/inactiva (R2.1/R2.2). Si
  `name` viene, se aplica `trim()`.

Mapeo snake_case↔camelCase con el `mapRow` ya existente (sin capa genérica, conforme a
`docs/conventions.md`).

### 3. Pantallas (Expo Router, `src/app/people/`)

Nueva carpeta `src/app/people/`. Copy en español; identificadores en inglés.

- **`src/app/people/index.tsx`** — listado del roster (R4).
  - Carga con `listPeople()` en `useEffect` (patrón de `claim-person.tsx`: estado
    `loading`/`error`, `useCallback` para recargar).
  - Render con `Card` + `ListRow` por persona (patrón de `claim-person.tsx`). Cada fila:
    `title = person.name`; si `!person.active`, mostrar un `Badge` "Inactiva"
    (`variant="neutral"` o `"warning"`) en `right` para distinguirla (R4.2).
  - `useAuth()` → `canWrite`. Si `canWrite`, cada `ListRow` es pulsable y navega a
    `/people/[id]` para editar; y se muestra un `Button` "Añadir persona" que navega a
    `/people/new` (R1.1, R5.3). Si `!canWrite`, filas no accionables y sin botón de alta
    (R5.1/R5.2).
  - `EmptyState` cuando el roster está vacío.
  - Al volver de crear/editar, refrescar la lista (recargar en foco con
    `useFocusEffect` de expo-router, o recarga simple al montar; elegir la opción más
    sencilla que garantice datos frescos).
- **`src/app/people/new.tsx`** — alta (R1).
  - Guarda de escritura: si `!canWrite`, `router.replace('/people')` (defensa en
    profundidad junto a RLS; no confiar solo en ocultar el botón).
  - `TextField` (label "Nombre") + `Button` "Crear". Validación no-vacío/solo-espacios
    → `error` en el `TextField` y no llamar al servicio (R1.3). En éxito, `createPerson`
    y `router.back()`. En error de backend, mensaje (R1.4). Estado `loading` en el botón.
- **`src/app/people/[id].tsx`** — edición (R2, R3).
  - Guarda de escritura como en `new.tsx`.
  - Obtiene el `id` con `useLocalSearchParams`. Carga la persona (de `listPeople()` o un
    `getPerson(id)` puntual; para no crear un servicio de un solo uso, se puede filtrar
    de `listPeople()` o recibir por params — elegir lo más simple, preferible cargar la
    lista y buscar por id, o añadir `getPerson` solo si aporta claridad).
  - `TextField` de nombre prellenado + `Button` "Guardar" (renombra, R3.1/R3.2) y un
    control para alternar `active`: `Button` "Marcar como inactiva" / "Marcar como
    activa" según el estado actual (R2.1/R2.2), que llama `updatePerson(id, { active })`.
    Mensaje explicando que marcar inactiva no borra el histórico.

### 4. Registro de rutas (`src/app/_layout.tsx`)

Añadir al `<Stack>` las pantallas nuevas con su título (patrón existente):

```tsx
<Stack.Screen name="people/index" options={{ title: 'Personas' }} />
<Stack.Screen name="people/new" options={{ title: 'Nueva persona', presentation: 'modal' }} />
<Stack.Screen name="people/[id]" options={{ title: 'Editar persona' }} />
```

`AuthGate` no necesita cambios: no se fuerza login para ver el roster (lectura pública);
el gating de escritura es por `canWrite` dentro de las pantallas.

### 5. Punto de entrada (`src/app/index.tsx`)

Añadir en la Home un acceso al roster (p. ej. un `Button`/`ListRow` "Personas" →
`router.push('/people')`), visible para todos (la lista es pública). Cambio mínimo,
sin construir la navegación pública completa (eso es f-012).

## Modelo de datos

No cambia. Se usa `Person` de `src/types/domain.ts` (`id, name, active,
claimedByUserId, createdAt`) y la tabla `people` de f-010. Sin migración nueva.

## Estrategia de test

Sin BBDD real; mock de `@/services/supabase`, patrón del `people.test.ts` existente.

- **`src/__tests__/services/people.test.ts`** (ampliar): 
  - `listPeople` hace `from('people').select('*').order('name')` y mapea filas
    (incluida una inactiva) a `Person`; lanza en error.
  - `createPerson` inserta `{ name }` (con `trim`), no envía `claimed_by_user_id` ni
    `active`, y devuelve la `Person` mapeada del row insertado.
  - `updatePerson` con `{ active: false }` envía solo `active` (nunca
    `claimed_by_user_id`) y con `{ name }` aplica `trim`; devuelve la `Person` mapeada;
    lanza en error.
  - Mantener verdes los tests existentes de `listClaimablePeople`/`claimPerson`
    (cuidado al reconfigurar los mocks encadenados: `insert`/`update`/`select`/`single`
    necesitan sus propios `mockReturnValue`; ver el `beforeEach` actual).
- **`src/__tests__/app/people/index.test.tsx`** (gating de UI, criterio de aceptación 3
  lado UI, exigido por `docs/conventions.md`):
  - Con `canWrite = false` (mock de `@/context/AuthContext`) NO se renderiza el control
    "Añadir persona" y las filas no son accionables.
  - Con `canWrite = true` sí aparece "Añadir persona".
  - Mockear `@/services/people` (`listPeople`) para no depender de red. Recordatorio
    RNTL 14: `await render(...)` (render asíncrono, ver `docs/conventions.md`).
- **RLS**: no se ejecuta Postgres en CI. La restricción de escritura es la política
  `people_write_claimed_person` ya verificada manualmente en el flujo de f-011; f-001
  añade una nota en `supabase/README.md` señalando que el alta y el marcar-inactiva de
  `people` quedan cubiertos por ese mismo escenario (usuario sin `Person` reclamada / 
  `anon` no puede `INSERT`/`UPDATE` en `people`).

## Riesgos / notas

- Reconfigurar los mocks encadenados de Supabase en `people.test.ts` sin romper los
  casos existentes es el punto más delicado; estructurar el `beforeEach` para cubrir
  `select().order()`, `insert().select().single()` y `update().eq().select().single()`.
- Los servicios nunca deben incluir `claimed_by_user_id` en el payload de `update`: es
  lo que mantiene el `UPDATE` compatible con el trigger `protect_person_claim` (R2.4).

## Desviaciones respecto al diseño original (implementación)

- **Hrefs de `expo-router` con `experiments.typedRoutes: true`**: el diseño no detallaba
  la forma exacta de los `href` a pasar a `router.push`/`router.replace`. Con las rutas
  tipadas activas, el fichero generado `.expo/types/router.d.ts` (no versionado) solo
  acepta el literal `/people/index` para volver al listado (no `/people` a secas), y para
  navegar a la edición de una persona concreta hay que usar la forma de objeto
  `router.push({ pathname: '/people/[id]', params: { id: person.id } })` en vez de una
  plantilla de string `` `/people/${id}` ``. `src/app/index.tsx`, `src/app/people/new.tsx`
  y `src/app/people/[id].tsx` usan `/people/index` para volver al roster;
  `src/app/people/index.tsx` usa la forma de objeto para navegar a `/people/[id]`. Esto no
  afecta a ningún criterio de aceptación, solo a la sintaxis de navegación.

## Desviaciones respecto al diseño original (post-revisión)

- **Ampliación de tests de pantalla más allá del alcance inicial**: la revisión del
  subagente `reviewer` señaló un hueco menor (no bloqueante) frente a
  `docs/conventions.md` ("pantallas con interacción compleja... requieren test"):
  `src/app/people/new.tsx` tiene lógica de guarda de escritura y validación de
  formulario no cubierta por tests, y el `Badge` "Inactiva" de `src/app/people/index.tsx`
  (R4.2) tampoco tenía un caso explícito. Se añadió:
  - `src/__tests__/app/people/new.test.tsx`: guarda de escritura (`canWrite=false`
    oculta el formulario y redirige a `/people/index`; `canWrite=true` lo muestra) y
    validación de nombre (nombre vacío no llama a `createPerson` y muestra el mensaje de
    error; nombre válido sí llama a `createPerson` con el nombre).
  - Ampliación de `src/__tests__/app/people/index.test.tsx` con un caso que verifica que
    una `Person` inactiva renderiza el `Badge` "Inactiva" (R4.2).
  - **Gotcha adicional de RNTL 14** (complementa la nota ya existente sobre `await
    render(...)`): `fireEvent.press(...)` y `fireEvent.changeText(...)` también son
    **asíncronos** en `@testing-library/react-native` 14.x (devuelven una `Promise`
    envuelta en `act()`); hay que hacer `await fireEvent.press(...)` / `await
    fireEvent.changeText(...)`, si no la actualización de estado no se refleja antes de
    la siguiente aserción y el test falla con "Number of calls: 0" sin error explícito.
  - No se ha modificado código de aplicación: los tests nuevos confirman el
    comportamiento ya implementado, sin destapar ningún bug.

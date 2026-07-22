# f-002 — Gestión de ediciones (años) · Diseño

## 1. Resumen y estrategia

Feature CRUD estándar que espeja el patrón ya establecido por `f-001-people-management`
(`src/services/people.ts` + `src/app/people/*`) y reutiliza el gating de escritura de `f-012`
(`useAuth().canWrite`). No hay backend nuevo: la tabla `editions` y sus políticas RLS ya existen
en `supabase/migrations/20260719120000_init_schema.sql`.

Piezas: un servicio `src/services/editions.ts` (acceso a datos, única capa que habla con
Supabase), tres pantallas Expo Router bajo `src/app/editions/`, su registro en el `Stack` de
`src/app/_layout.tsx`, una tarjeta de acceso desde el home, y tests de servicio.

## 2. Modelo de datos (sin cambios)

`Edition` ya está definida en `src/types/domain.ts`:

```ts
interface Edition { id: string; year: number; label: string | null;
  startDate: string | null; endDate: string | null; createdAt: string; }
```

Columnas SQL (snake_case) en `public.editions`: `id, year (unique), label, start_date,
end_date, created_at`. El servicio mapea `start_date → startDate`, `end_date → endDate`,
`created_at → createdAt`. Fechas como `string` ISO `YYYY-MM-DD` (tipo `date` de Postgres).

## 3. Servicio `src/services/editions.ts` (R1, R2, R3)

Espeja el estilo de `src/services/people.ts` (interfaz `Row`, `mapRow`, funciones async que
lanzan en error). API:

```ts
interface EditionRow { id: string; year: number; label: string | null;
  start_date: string | null; end_date: string | null; created_at: string; }

function mapRow(row: EditionRow): Edition // snake_case -> camelCase

/** Error reconocible por la UI: el año ya pertenece a otra edición (unique(year)). */
export class EditionYearTakenError extends Error { /* name = 'EditionYearTakenError' */ }

interface EditionInput { year: number; label?: string | null;
  startDate?: string | null; endDate?: string | null; }

/** Todas las ediciones ordenadas por año descendente (R3.1). */
export async function listEditions(): Promise<Edition[]>
//   supabase.from('editions').select('*').order('year', { ascending: false })

/** Alta (R1.1). Traduce el código 23505 a EditionYearTakenError (R1.2). */
export async function createEdition(input: EditionInput): Promise<Edition>
//   insert { year, label, start_date, end_date }; label/fechas -> null si vacías (R1.4)

/** Edición parcial (R2.1). Traduce 23505 a EditionYearTakenError (R2.2). */
export async function updateEdition(id: string, changes: Partial<EditionInput>): Promise<Edition>
//   payload solo con las claves presentes en `changes`; .eq('id', id)
```

Detalles:
- Normalización: `label` se recorta (`trim()`); si queda vacío → `null`. `startDate`/`endDate`
  vacíos (`''` o `undefined`) → `null` (R1.4). El servicio no valida el rango de fechas ni el
  formato del año: eso es de la pantalla (R1.3/R1.5); el servicio asume input ya validado y solo
  normaliza y persiste, igual que `createPerson` deja la validación de nombre a la UI.
- Traducción de error: patrón idéntico a `PersonAlreadyClaimedError`. Si `error.code === '23505'`
  (unique violation de `unique(year)`), lanzar `EditionYearTakenError`; cualquier otro error se
  propaga tal cual.

## 4. Pantallas Expo Router (R3, R4)

### `src/app/editions/index.tsx` — listado (espeja `people/index.tsx`)
- Carga con `listEditions()` en `useFocusEffect` (recarga al enfocar, R3.3).
- Título "Ediciones" + subtítulo. Estado de error en `Text color="danger"`.
- `EmptyState` si no hay ediciones (R3.2).
- Botón "Añadir edición" → `router.push('/editions/new')` **solo si `canWrite`** (R4.2).
- Lista en `Card` con `ListRow`: título `${year}` y, si hay `label`, mostrarlo (p. ej. como
  subtítulo o `right`); fila navegable a `/editions/[id]` con chevron **solo si `canWrite`**
  (R4.2). El orden lo da el servicio (year desc), no la UI (R3.1).

### `src/app/editions/new.tsx` — crear (espeja `people/new.tsx`)
- `useEffect` → `router.replace('/editions/index')` si `!canWrite`; `return null` mientras (R4.3).
- Campos: `TextField` año (numérico, `keyboardType="number-pad"`), `TextField` etiqueta
  (opcional), `TextField` fecha inicio y fecha fin (opcionales, formato `YYYY-MM-DD`).
- Validación en pantalla antes de llamar al servicio (R1.3/R1.5): año no vacío y entero válido
  (`Number.isInteger`); si hay ambas fechas y fin < inicio, error. Mensajes de campo en español.
- `createEdition(...)` en try/catch: `EditionYearTakenError` → mensaje "Ya existe una edición
  para ese año." (R1.2); otro error → mensaje genérico. En éxito, `router.back()`.

### `src/app/editions/[id].tsx` — editar (espeja `people/[id].tsx`)
- Mismo guard `!canWrite` → `router.replace('/editions/index')` (R4.3).
- Carga la edición vía `listEditions()` + `find(id)` (mismo enfoque que `people/[id]`, evita un
  `getEdition` de un solo uso — conventions: sin abstracciones prematuras). Estados cargando /
  no encontrada.
- Formulario precargado; `updateEdition(id, changes)` con el mismo manejo de
  `EditionYearTakenError` (R2.2). En éxito, refresca estado local.

### Copy
UI en español ("Ediciones", "Añadir edición", "Nueva edición", "Editar edición", "Año",
"Etiqueta (opcional)", "Fecha de inicio (opcional)", "Fecha de fin (opcional)"); identificadores
en inglés (conventions.md).

## 5. Registro de rutas — `src/app/_layout.tsx`

Añadir al `Stack` (junto a las de `people`), sin tocar `AuthGate`:

```tsx
<Stack.Screen name="editions/index" options={{ title: 'Ediciones' }} />
<Stack.Screen name="editions/new" options={{ title: 'Nueva edición', presentation: 'modal' }} />
<Stack.Screen name="editions/[id]" options={{ title: 'Editar edición' }} />
```

## 6. Acceso desde el home — `src/app/index.tsx`

Añadir una `Card` "Ediciones" con `Button variant="outline"` "Ver ediciones" →
`router.push('/editions/index')`, espejando la tarjeta "Personas" ya presente. Cambio aditivo
y localizado. **Aviso de concurrencia:** `src/app/index.tsx` lo tocó `f-012` y podría tocarlo la
sesión de `f-001` en paralelo; el implementer debe releer el archivo justo antes de editar y
añadir solo la tarjeta, sin reescribir el resto.

## 7. Archivos afectados

Nuevos:
- `src/services/editions.ts`
- `src/app/editions/index.tsx`
- `src/app/editions/new.tsx`
- `src/app/editions/[id].tsx`
- `src/__tests__/services/editions.test.ts`

Modificados:
- `src/app/_layout.tsx` (registrar las tres rutas de editions)
- `src/app/index.tsx` (tarjeta de acceso "Ediciones")

Verificados (sin cambios):
- `supabase/migrations/20260719120000_init_schema.sql` (tabla `editions` + RLS ya presentes)

**No tocar** (propiedad de la sesión paralela `f-001`): `src/services/people.ts`,
`src/app/people/*`, `src/__tests__/services/people.test.ts`, `specs/f-001-people-management/*`.

## 8. Pruebas (conventions.md)

`src/__tests__/services/editions.test.ts`, espejando el mock de fluent API de
`people.test.ts` (mockear `@/services/supabase`, encadenar `from().select().order()`,
`from().insert().select().single()`, `from().update().eq().select().single()`):
- `listEditions`: llama `.order('year', { ascending: false })` y devuelve filas mapeadas
  (camelCase) (R3.1).
- `createEdition`: inserta `year` + `label`/fechas normalizadas a `null` cuando vacías (R1.4);
  con error `code: '23505'` lanza `EditionYearTakenError` (R1.2); otro error se propaga.
- `updateEdition`: envía solo las claves cambiadas; con `code: '23505'` lanza
  `EditionYearTakenError` (R2.2).

Cobertura de permisos (conventions.md exige verificar que anónimo/sin-Person no escribe): las
pantallas `new`/`[id]` redirigen si `!canWrite` (R4.3, defensa en profundidad) y la garantía
real es la política RLS `editions_write_claimed_person`, cuya verificación contra Supabase real
es el paso manual ya documentado en `supabase/README.md` (R4.4/R4.5). Los tests de servicio no
cubren RLS (usan mock); la restricción de escritura se valida por RLS + guards de UI, no por el
servicio.

## 9. Desviación detectada durante la implementación

El tipo de rutas autogenerado por Expo Router (`.expo/types/router.d.ts`, gitignored, no se toca
a mano) solo incluía `/editions/[id]`, `/editions` y `/editions/new` en el momento de implementar
las pantallas, no la plantilla comodín `/editions/${SingleRoutePart<T>}` que permite que el
literal `/editions/index` (usado en `router.push`/`router.replace`, mismo patrón que
`/people/index` de f-001) pase `tsc --noEmit`. Es un artefacto de build desactualizado (se
regenera al arrancar Metro/`expo start`), no un defecto de código: se resolvió arrancando
brevemente `expo start --web` en un puerto libre para forzar el rescaneo de rutas, sin tocar el
archivo generado a mano ni cambiar las cadenas de ruta usadas en el código (siguen siendo
`/editions/index` como especifica este documento). Si en una ejecución futura de `npm run
typecheck` reaparece este error, repetir el mismo paso (arrancar y parar `expo start`) antes de
diagnosticar un defecto real.

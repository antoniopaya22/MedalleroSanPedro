# f-008-historical-data-import — Diseño

## 1. Naturaleza de la feature

No es UI ni CRUD: es un **script de migración puntual** (one-off) que carga
`data/historico-medallas.json` en las tablas de dominio de Supabase. Se ejecuta
una vez (tras aplicar las migraciones y antes de abrir la app a usuarios), con
**privilegios elevados** (service role), porque no hay un usuario autenticado con
`Person` reclamada detrás de una carga histórica masiva.

## 2. Por qué no se reutilizan `src/services/*`

`src/services/supabase.ts` importa `react-native-url-polyfill/auto` y
`@react-native-async-storage/async-storage` y usa la **anon key**
(`EXPO_PUBLIC_SUPABASE_ANON_KEY`); es un cliente React Native que ni corre en
Node ni tiene privilegios de escritura sin sesión. Todos los `src/services/*.ts`
importan ese cliente. Por tanto el script **no** puede reutilizarlos: construye su
propio cliente Node de `@supabase/supabase-js` con la service role key. Sí se
reutiliza el **conocimiento** de forma (nombres de columnas snake_case,
`participant_ids uuid[]`, `medal_awards.person_ids uuid[]`, enum `medal`) y las
**invariantes** de la RPC `create_activity_result_with_awards`, replicadas en la
capa de transformación pura.

## 3. Estrategia de inserción: directa, no vía RPC

La RPC `create_activity_result_with_awards` es `security invoker`, fija
`created_by_user_id = auth.uid()` (null con service role) y **exige ≥1 medalla**
(`raise ... 'at least one medal award is required'`). El histórico tiene 995
pruebas reales todas con ≥1 medalla y 1 artefacto sin participantes que se omite
(R4.5), así que la RPC sería viable, pero se opta por **inserción directa** con el
cliente service role porque:

- Da control total sobre `participant_ids` (fidelidad exacta, incluidos los
  participantes sin medalla) y sobre el orden/batching de 995 filas.
- No depende de `auth.uid()` ni acopla la migración a la firma de la RPC.
- Es robusta ante una hipotética prueba con participantes pero sin medallas.

La capa de transformación pura replica las invariantes de la RPC (R4.4) antes de
insertar, de modo que los datos cargados son válidos igual que si hubieran pasado
por la app. Service role **bypassa RLS** (por eso puede escribir sin
`has_claimed_person()`).

## 4. Estructura de archivos

Todo bajo `src/scripts/historico/` (código) y `src/__tests__/scripts/historico/`
(tests), respetando la convención "código en `src/`, test espejado en
`src/__tests__/`".

```
src/scripts/historico/
  normalizeActivityName.ts   # PURO: clave canónica, alias, nombre preferente
  buildImportPlan.ts         # PURO: JSON -> plan de importación + validación
  importHistorico.ts         # I/O: cliente service role + inserciones + verify
  types.ts                   # (opcional) tipos del JSON de origen y del plan
src/__tests__/scripts/historico/
  normalizeActivityName.test.ts
  buildImportPlan.test.ts
  security.test.ts           # R7.3: la service role key sólo vive en src/scripts
```

### 4.1 `normalizeActivityName.ts` (puro, testeado)

- `canonicalKey(raw: string): string` — `raw.trim()`, colapsa espacios internos a
  uno, `normalize('NFD')` + elimina `\p{Diacritic}` (tildes), `toLowerCase()`.
  Ej.: `"Frontón "` → `"fronton"`, `"  Fútbol"` → `"futbol"`, `"Call of Duty"` →
  `"call of duty"`.
- `ALIAS_MAP: Record<string, string>` — errores ortográficos inequívocos del mismo
  nombre, **clave = clave canónica de la variante errónea**, valor = clave canónica
  destino. Cobertura mínima obligatoria (R3.2), a ampliar por el implementer siendo
  **conservador** (sólo typos claros del mismo nombre, nunca sub-variantes
  semánticas):
  - `"lazamiento de disco"` → `"lanzamiento de disco"`
  - `"petnca"` → `"petanca"`
  - `"sprin"` → `"sprint"`
  - `"kingdomio"` → `"kingdomino"`
  - `"cricket"`/`"criquet"` unificados (destino `"criquet"`)
  - (los casos de sólo mayúsculas/tildes NO necesitan alias: los resuelve
    `canonicalKey`, p. ej. `fronton`/`Frontón`, `Futbol`/`Fútbol`, `catán`/`Catán`,
    `call of duty`/`Call of Duty`, `Badminton`/`Bádminton`).
- `resolveKey(raw): string` — aplica `ALIAS_MAP[canonicalKey(raw)] ?? canonicalKey(raw)`.
- `DISPLAY_OVERRIDES: Record<string, string>` — nombre de presentación curado por
  clave canónica cuando la mejor heurística no baste (p. ej. `"catan"` → `"Catán"`,
  `"fronton"` → `"Frontón"`, `"futbol"` → `"Fútbol"`, `"call of duty"` → `"Call of
  Duty"`, `"criquet"` → `"Criquet"`).
- `preferredDisplayName(canonicalKey, rawVariants[]): string` — si hay override, lo
  usa; si no, elige la variante cruda más frecuente, desempatando por: (1) contiene
  diacríticos, (2) no es todo-minúsculas, (3) mayor longitud, (4) orden alfabético.
  Así `Frontón` gana a `fronton`.

### 4.2 `buildImportPlan.ts` (puro, testeado)

`buildImportPlan(source: HistoricoJson): ImportPlan` donde:

```
ImportPlan = {
  editions:  { jsonId: string; year: number }[]
  people:    { jsonId: string; name: string }[]
  activities:{ canonicalKey: string; name: string; rawVariants: string[] }[]
  results:   {
    jsonId: string; editionJsonId: string; activityCanonicalKey: string;
    participantJsonIds: string[];
    medalAwards: { medal: Medal; personJsonIds: string[] }[];
  }[]
  skipped:   { jsonId: string; reason: string }[]   // R4.5
}
```

Reglas:
- Personas y ediciones se copian 1-a-1 desde el JSON (R1/R2).
- Actividades: recolecta todos los `activity` crudos de todas las pruebas, agrupa
  por `resolveKey`, crea una entrada por clave con `name = preferredDisplayName(...)`
  (R3).
- Resultados: por cada `activityResult` con ≥1 participante, `participantJsonIds` =
  todos los `participants[].personId` (dedup preservando orden); agrupa por color
  los `participants` con `medal` no nulo en `medalAwards`. Omite (a `skipped`) las
  pruebas con 0 participantes (R4.5).
- **Validación** (lanza `Error` con contexto si falla): todo `personId` existe en
  `people`; sin participante duplicado; ≤1 award por color; todo ganador ∈
  participantes; ninguna persona en dos colores. (Datos verificados: hoy se cumple
  para las 995 pruebas.)

### 4.3 `importHistorico.ts` (I/O, no unit-testeado; ejecución manual)

1. Lee `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` del entorno; aborta claro si
   falta alguna (R7.4), sin loguear su valor.
2. `createClient(url, serviceRoleKey, { auth: { persistSession:false,
   autoRefreshToken:false } })` — cliente Node con privilegios elevados (R7.1).
3. Lee `data/historico-medallas.json`, `buildImportPlan(...)`.
4. **Guarda de idempotencia (R8):** consulta `count` de `editions` y
   `activity_results`. Si no vacías y no hay `--reset` → aborta. Con `--reset`,
   borra en orden FK-seguro: `medal_awards` → `activity_results` → `activities`,
   `editions`, `people` (respetando `on delete`).
5. Inserta ediciones y personas; construye mapas `jsonId → uuid` a partir de las
   filas devueltas (`.select()`). Inserta actividades; mapa `canonicalKey → uuid`.
6. Por cada resultado del plan: `insert` en `activity_results` (traduciendo
   `editionJsonId`, `activityCanonicalKey` y `participantJsonIds` a uuids;
   `created_by_user_id = null`, `played_at = null`), recupera su `id`, e inserta sus
   `medal_awards` (traduciendo `personJsonIds` a uuids). Se pueden batchear los
   inserts de medallas.
7. **Verificación post-carga (R6.1):** reagrega por persona los oros/platas/bronces
   insertados y los compara con los totales del plan; imprime un resumen
   (ediciones/personas/actividades/resultados creados, filas omitidas) y avisa si
   hay discrepancia.

## 5. Modelo de datos (recordatorio de columnas)

- `editions(id uuid, year int unique, ...)`
- `people(id uuid, name text, active bool default true, claimed_by_user_id null)`
- `activities(id uuid, name text)` con índice único `lower(name)`
  (`activities_name_lower_key`).
- `activity_results(id uuid, edition_id, activity_id, participant_ids uuid[],
  played_at date null, notes text null, created_by_user_id uuid null)`
- `medal_awards(id uuid, result_id, medal enum, person_ids uuid[] (>=1),
  unique(result_id, medal))`

## 6. Seguridad (R7)

- Variables **sin** prefijo `EXPO_PUBLIC_`: `SUPABASE_URL`,
  `SUPABASE_SERVICE_ROLE_KEY`. Añadir a `.env.example` con placeholders y comentario
  explícito: "Sólo para `src/scripts/historico/importHistorico.ts`. NUNCA usar
  prefijo `EXPO_PUBLIC_` ni referenciar desde la app: expondría la clave con
  permisos totales en el bundle del cliente".
- `security.test.ts`: grep sobre `src/` excluyendo `src/scripts/` y
  `src/__tests__/`, afirmando que no aparece `SUPABASE_SERVICE_ROLE_KEY` ni
  `service_role` fuera del script; y que `importHistorico.ts` no importa
  `@/services/supabase`. Cubre el criterio de permisos como test automatizado
  (conventions.md exige test o verificación manual documentada para permisos).
- Justificación del service role documentada en `supabase/README.md` y en el
  encabezado del script.

## 7. Ejecución y tooling (R9)

- La **lógica de negocio** (normalización + plan) se valida con `npm test`
  (Jest ya funciona) contra el JSON real: no requiere base de datos ni tooling
  nuevo, y cubre todos los criterios de aceptación comprobables offline.
- La **ejecución real** contra Supabase es un paso manual del usuario (igual que
  las verificaciones de RLS ya documentadas en `supabase/README.md`, que no corren
  en CI). Se ejecuta con `npx tsx src/scripts/historico/importHistorico.ts`
  (opcional `-- --reset`). Documentar en `supabase/README.md`. No es obligatorio
  añadir `tsx` a `devDependencies`; si el implementer lo añade, debe verificar que
  `npm run typecheck` y `npm test` siguen verdes. El script **no** debe ser
  importado por código de app ni por tests que corran en jest-expo.

## 8. Tests (R9.4) y datos esperados

`buildImportPlan.test.ts` (contra `data/historico-medallas.json`):
- 17 ediciones (años 2009-2025), 21 personas.
- Dedup de actividades: `resolveKey` colapsa las variantes de los ejemplos de
  aceptación a una sola entrada, con el `name` preferente correcto
  (`Frontón`, `Fútbol`, `Catán`, `Call of Duty`, `Lanzamiento de disco`,
  `Petanca`); ninguna clave canónica aparece dos veces en `activities`.
- 995 resultados en el plan, 1 en `skipped` (`2021-054`).
- Fidelidad de participación: para una prueba conocida, `participantJsonIds`
  contiene a los `medal:null` y a los ganadores; los `medalAwards` sólo a los
  ganadores agrupados por color.
- **R6.1 — totales por persona** (suma directa del JSON = hoja RESULTADOS), que el
  plan debe reproducir al agregar `medalAwards` por persona:

  | persona | oro | plata | bronce | total |
  |---|---|---|---|---|
  | abuelos | 2 | 0 | 2 | 4 |
  | antonio | 20 | 13 | 8 | 41 |
  | anuncia | 9 | 10 | 8 | 27 |
  | camila | 3 | 6 | 1 | 10 |
  | carlos | 79 | 98 | 61 | 238 |
  | chema | 14 | 20 | 4 | 38 |
  | dario | 132 | 137 | 101 | 370 |
  | david | 283 | 201 | 93 | 577 |
  | hana | 9 | 8 | 5 | 22 |
  | ines | 19 | 15 | 16 | 50 |
  | jorge | 116 | 87 | 91 | 294 |
  | laura | 116 | 90 | 65 | 271 |
  | lucia | 18 | 15 | 9 | 42 |
  | maite | 5 | 8 | 2 | 15 |
  | nuria | 96 | 112 | 84 | 292 |
  | pedro | 55 | 35 | 19 | 109 |
  | poli | 81 | 88 | 56 | 225 |
  | roberto | 1 | 1 | 1 | 3 |
  | sara | 139 | 128 | 81 | 348 |
  | sergio | 347 | 225 | 129 | 701 |

  El test puede recomputar estos totales desde el JSON de forma independiente y
  compararlos con la agregación del plan (regresión de fidelidad), y opcionalmente
  congelar la tabla anterior como fixture.

`normalizeActivityName.test.ts`:
- `canonicalKey` normaliza mayúsculas/tildes/espacios (casos de la tabla de
  ejemplos).
- `resolveKey` aplica el alias map (typos → destino).
- `preferredDisplayName` elige el nombre con tildes/mayúsculas correctas.

## 9. Fuera de alolcance / limitaciones documentadas

- No se fusionan sub-variantes semánticas ni divisiones (`Frontón parejas`,
  `... Jr.`, `... infantil`), ni pares dudosos (`Carrera bici` vs `Carrera en
  bici`): sólo variantes de caja/tilde/espacio y typos inequívocos del mismo
  nombre (R3.5). Un curado exhaustivo de las 494 variantes es un ejercicio de
  datos posterior, no un bloqueante de esta feature.
- La ejecución real del `INSERT` contra Supabase la hace el usuario con sus
  credenciales; esta feature entrega el script, sus tests y la documentación.

## 10. Desviación documentada por el implementer

- §4.2 dice "recolecta todos los `activity` crudos de todas las pruebas" para
  construir el catálogo de `Activity`, sin precisar si incluye las pruebas
  omitidas (R4.5). Implementado: el catálogo sólo recolecta nombres de
  actividad de los `activityResults` **no omitidos** (con ≥1 participante).
  El único artefacto omitido (`2021-054 "MEDALLERO"`) no comparte nombre con
  ninguna prueba real, así que incluirlo crearía una `Activity` "Medallero"
  huérfana (sin ningún `ActivityResult` que la referencie); excluirlo evita
  ese ruido en el catálogo sin afectar a R3 (todas las claves canónicas de
  pruebas reales siguen deduplicándose igual).

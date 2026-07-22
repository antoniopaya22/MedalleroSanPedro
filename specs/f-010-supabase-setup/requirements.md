# f-010-supabase-setup — Requisitos

Configurar la integración con Supabase en dos frentes: (1) el **cliente** de
`@supabase/supabase-js` en `src/services/supabase.ts`, inicializado leyendo
`EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` de variables de entorno
(nunca hardcodeadas); y (2) el **esquema de Postgres** (migraciones SQL) para
`editions`, `people`, `profiles`, `activities`, `activity_results`, `medal_awards`,
con Row Level Security activo desde el primer día (lectura pública donde corresponda,
escritura restringida a usuarios autenticados con `Person` reclamada).

El proyecto Supabase real (URL, anon key, aplicar las migraciones) lo provisiona el
**usuario**; esta feature entrega el código cliente y el SQL versionado, no credenciales
ni un proyecto en la nube.

## Alcance

- **Incluye:**
  - `src/services/supabase.ts`: inicialización del cliente desde variables de entorno,
    con error claro si faltan; sin credenciales en el código.
  - Tipos TypeScript del esquema en `src/types/` (Edition, Person, Profile, Activity,
    ActivityResult, MedalAward, tipo `Medal`), alineados con `docs/domain-model.md`.
  - Migración(es) SQL versionada(s) bajo `supabase/migrations/` con las seis tablas,
    constraints de integridad del dominio, `ENABLE ROW LEVEL SECURITY` y las políticas
    RLS (SELECT público donde corresponda; escritura solo autenticado con `Person`
    reclamada).
  - Tests de la lógica del cliente (`src/__tests__/services/`) y verificación
    documentada de RLS.
  - Actualizar `docs/tech-stack.md` con la versión de `@supabase/supabase-js` instalada.
- **Excluye:**
  - Configurar el proveedor Google OAuth, el flujo de login, el onboarding de reclamar
    `Person`, el trigger de auto-creación de `Profile` y la política/RPC específica de
    reclamación de persona (todo eso es `f-011-auth-google-sso`).
  - Cualquier pantalla de negocio (ediciones, rankings, registro de resultados).
  - Datos: la importación del histórico es `f-008-historical-data-import`.
  - Crear el proyecto Supabase real, sus credenciales o aplicar las migraciones en la
    nube (lo hace el usuario).

## Requisitos EARS

### R1 — Inicialización del cliente sin credenciales hardcodeadas

- CUANDO el módulo `src/services/supabase.ts` inicializa el cliente
  EL SISTEMA DEBERÁ leer la URL y la anon key exclusivamente de
  `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY`, sin ningún valor de
  credencial literal en el código fuente.
- CUANDO alguna de esas dos variables de entorno falta o está vacía
  EL SISTEMA DEBERÁ fallar con un mensaje de error claro que indique qué variable falta
  y remita a `.env.example`, en lugar de crear un cliente con valores vacíos.
- CUANDO otras capas de la app necesiten acceder a Supabase
  EL SISTEMA DEBERÁ exponer una única instancia del cliente desde `src/services/`
  (capa única de acceso a datos, ver `docs/architecture.md`), sin instanciarlo desde
  componentes.

### R2 — Esquema de tablas del dominio

- CUANDO se aplican las migraciones sobre una base Postgres de Supabase
  EL SISTEMA DEBERÁ crear las tablas `editions`, `people`, `profiles`, `activities`,
  `activity_results` y `medal_awards`, con columnas y tipos acordes a
  `docs/domain-model.md`.
- CUANDO se define `people`
  EL SISTEMA DEBERÁ incluir `claimed_by_user_id` (nullable, **único**) referenciando
  `auth.users`, para soportar la reclamación 1—1 de persona (ADR 0002).
- CUANDO se define `profiles`
  EL SISTEMA DEBERÁ extender `auth.users` (PK `user_id`) con `email` y `person_id`
  (nullable, **único**, FK a `people`), **sin** campo de rol (ADR 0005).
- CUANDO se define `medal_awards`
  EL SISTEMA DEBERÁ representar la medalla como uno de tres valores (`gold`/`silver`/
  `bronze`, tipo `Medal` en código; copy de UI `Oro/Plata/Bronce`), con **como mucho un
  `MedalAward` por color y por `activity_result`** (ADR 0004).
- CUANDO se define `activity_results`
  EL SISTEMA DEBERÁ almacenar `participant_ids` como el censo completo de la prueba
  (participantes con y sin medalla), de forma que "participó sin medalla" sea un estado
  almacenado y no derivado (ver `docs/domain-model.md`).

### R3 — Row Level Security activo en todas las tablas

- CUANDO se crea cualquiera de las seis tablas
  EL SISTEMA DEBERÁ ejecutar `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` sobre ella
  (RLS activo desde el primer día, ADR 0001) — el modo público se logra con políticas
  `SELECT` abiertas, nunca desactivando RLS.

### R4 — Lectura pública (rol anon)

- CUANDO un cliente sin sesión (rol `anon`) consulta `editions`, `people`, `activities`,
  `activity_results` o `medal_awards`
  EL SISTEMA DEBERÁ permitir la lectura (`SELECT`) sin requerir autenticación
  (ADR 0003).
- CUANDO un cliente sin sesión consulta `profiles`
  EL SISTEMA DEBERÁ NO exponer los datos de `profiles` a `anon` (los perfiles contienen
  email y solo son visibles para su propio dueño autenticado).

### R5 — Escritura restringida a autenticado con Person reclamada

- CUANDO un cliente sin sesión (`anon`) intenta `INSERT`/`UPDATE`/`DELETE` en cualquiera
  de las seis tablas
  EL SISTEMA DEBERÁ denegar la operación (ninguna política de escritura abierta a
  `anon`).
- CUANDO un usuario autenticado **sin** `Person` reclamada (`person_id` nulo en su
  `profiles`) intenta escribir en `editions`, `people`, `activities`,
  `activity_results` o `medal_awards`
  EL SISTEMA DEBERÁ denegar la operación.
- CUANDO un usuario autenticado **con** `Person` reclamada (`person_id` no nulo) escribe
  en esas tablas
  EL SISTEMA DEBERÁ permitir la operación (`INSERT`/`UPDATE`/`DELETE`), aplicando la
  condición `auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM profiles WHERE user_id =
  auth.uid() AND person_id IS NOT NULL)` (ADR 0005).

### R6 — Tipos de dominio en TypeScript

- CUANDO otra feature consuma datos de Supabase desde la app
  EL SISTEMA DEBERÁ ofrecer tipos TypeScript en `src/types/` para las seis entidades y
  el tipo `Medal` (`gold | silver | bronze`), con identificadores en inglés
  (`docs/conventions.md`).

### R7 — Verificación

- CUANDO se ejecuta `npm test`
  EL SISTEMA DEBERÁ incluir al menos un test que verifique el comportamiento del cliente
  (inicialización desde env y fallo claro si faltan variables) y que termine en verde.
- CUANDO se ejecuta `npx tsc --noEmit`
  EL SISTEMA DEBERÁ pasar sin errores con `strict: true`.
- CUANDO el usuario aplique las migraciones sobre su proyecto Supabase real
  EL SISTEMA DEBERÁ permitir verificar manualmente (consulta con rol `anon`) que
  `editions`, `activities`, `activity_results` y `medal_awards` son legibles sin sesión
  — este paso queda documentado como verificación manual a cargo del usuario, por
  requerir credenciales reales.

## Criterios de aceptación (verificables)

1. `src/services/supabase.ts` inicializa el cliente leyendo solo de
   `EXPO_PUBLIC_SUPABASE_*`, sin credenciales literales, y falla con mensaje claro si
   faltan.
2. Las migraciones crean las seis tablas del dominio con sus constraints de integridad.
3. Todas las tablas tienen RLS activado; `SELECT` público en las cinco de consulta,
   `profiles` solo legible por su dueño.
4. Ninguna política de escritura está abierta a `anon`; la escritura exige sesión con
   `person_id` no nulo.
5. Existen tipos TS de dominio en `src/types/` y el tipo `Medal`.
6. `npm test` y `npx tsc --noEmit` en verde.

## Fuera de alcance explícito

- Google OAuth, login, onboarding de reclamar `Person`, trigger de creación de `Profile`
  y la política/RPC de reclamación (f-011).
- Importación de datos históricos (f-008).
- Provisión del proyecto Supabase real y aplicación de migraciones en la nube (usuario).

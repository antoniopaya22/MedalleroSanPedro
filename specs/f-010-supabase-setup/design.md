# f-010-supabase-setup — Diseño técnico

## Objetivo

Entregar (1) el cliente de Supabase inicializado desde variables de entorno y (2) el
esquema SQL versionado (seis tablas + RLS) alineado con `docs/domain-model.md` y los ADR
0001–0005. Sin auth/login (f-011) ni datos (f-008). El proyecto Supabase real y la
aplicación de migraciones los hace el usuario.

## Decisiones

- **Dependencia f-000:** satisfecha — `f-000-project-bootstrap` está `done` (bootstrap
  Expo/TS/tests completo, ver `docs/tech-stack.md`, `src/` y `progress/history.md`), que
  es todo lo que f-010 necesita.
- **Paquete cliente:** `@supabase/supabase-js` (última estable). Se añade a
  `dependencies` de `package.json` y se documenta la versión en `docs/tech-stack.md`.
  No se añade adaptador de almacenamiento de sesión (AsyncStorage) ni configuración de
  auth: eso llega con f-011; para f-010 (lecturas anónimas y esquema) el cliente por
  defecto basta.
- **Lectura de env:** `process.env.EXPO_PUBLIC_SUPABASE_URL` y
  `process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY` (los prefijos `EXPO_PUBLIC_` los inyecta
  Expo en el bundle). Si falta alguna, lanzar `Error` con mensaje que nombre la variable
  y remita a `.env.example`. Ninguna credencial literal en el código.
- **Instancia única:** exportar un `supabase` (singleton del módulo) desde
  `src/services/supabase.ts`. Los componentes no instancian el cliente.
- **Migraciones versionadas:** SQL bajo `supabase/migrations/` con nomenclatura de la
  CLI de Supabase (`<timestamp>_<slug>.sql`). No se ejecutan aquí; el usuario las aplica
  con `supabase db push`/`supabase migration up` o pegándolas en el SQL Editor. `supabase/`
  **no** está en `.gitignore` (debe versionarse); solo `.env.local` lo está.
- **Enum de medalla:** tipo Postgres `medal` = `('gold','silver','bronze')`, coherente
  con el tipo `Medal` de código (`docs/conventions.md`); el copy `Oro/Plata/Bronce` es
  solo de UI y no vive en la BBDD.
- **Helper RLS de escritura:** función SQL `public.has_claimed_person()` `SECURITY
  DEFINER` que devuelve `auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles
  WHERE user_id = auth.uid() AND person_id IS NOT NULL)`. Reutilizada en todas las
  políticas de escritura para no duplicar la condición (ADR 0005).

## Archivos / carpetas a tocar

- `package.json` — añadir `@supabase/supabase-js` a `dependencies` e instalar.
- `src/services/supabase.ts` — inicialización del cliente (nuevo; hoy hay `.gitkeep`).
- `src/types/database.ts` (o `src/types/domain.ts`) — tipos TS de las seis entidades y
  `Medal`. Nombre a criterio del implementer; identificadores en inglés.
- `supabase/migrations/<timestamp>_init_schema.sql` — tablas + constraints + enum +
  helper + `ENABLE ROW LEVEL SECURITY` + políticas RLS. Puede dividirse en dos archivos
  (schema y policies) si resulta más legible.
- `src/__tests__/services/supabase.test.ts` — tests del cliente.
- `docs/tech-stack.md` — versión de `@supabase/supabase-js`.
- (Opcional) `supabase/README.md` o nota en `docs/tech-stack.md` con los pasos que el
  usuario debe seguir para aplicar las migraciones.

## Modelo de datos (esquema SQL)

Todas las PK `uuid default gen_random_uuid()`, `created_at timestamptz not null default
now()`. Nombres de columna en `snake_case`.

- **editions**: `id`, `year int not null unique`, `label text`, `start_date date`,
  `end_date date`, `created_at`.
- **people**: `id`, `name text not null`, `active boolean not null default true`,
  `claimed_by_user_id uuid unique references auth.users(id) on delete set null`,
  `created_at`.
- **profiles**: `user_id uuid primary key references auth.users(id) on delete cascade`,
  `email text`, `person_id uuid unique references public.people(id) on delete set null`,
  `created_at`. Sin `role` (ADR 0005). El trigger de auto-creación al primer login es de
  f-011; aquí solo la tabla.
- **activities**: `id`, `name text not null`, `created_at`.
- **activity_results**: `id`, `edition_id uuid not null references public.editions(id)
  on delete cascade`, `activity_id uuid not null references public.activities(id) on
  delete restrict`, `participant_ids uuid[] not null default '{}'`, `played_at date`,
  `notes text`, `created_by_user_id uuid references auth.users(id) on delete set null`,
  `created_at`.
- **medal_awards**: `id`, `result_id uuid not null references public.activity_results(id)
  on delete cascade`, `medal public.medal not null`, `person_ids uuid[] not null`,
  `created_at`, `unique (result_id, medal)` (como mucho un color por prueba, ADR 0004).

Notas de integridad:
- `participant_ids` y `person_ids` como arrays de uuid es lo mínimo para reflejar el
  dominio. Las reglas "los ganadores están en participant_ids" y "una persona no repite
  color en la misma prueba" no son triviales de imponer con un simple `CHECK` sobre
  arrays; se documentan como invariantes que hará cumplir la lógica de escritura de
  `f-004-medal-results-registration`. El implementer puede añadir `CHECK
  (array_length(person_ids,1) >= 1)` y `CHECK (cardinality(participant_ids) =
  cardinality(...))` donde sea barato, pero no debe bloquearse intentando validar
  subconjuntos entre tablas por trigger en f-010 (eso pertenece a f-004). Dejar comentado
  en el SQL qué invariantes quedan delegadas a la capa de aplicación.

## RLS — políticas

Para las **seis** tablas: `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`.

- **SELECT público** (`to anon, authenticated using (true)`) en: `editions`, `people`,
  `activities`, `activity_results`, `medal_awards`.
- **profiles SELECT**: solo el dueño — `using (user_id = auth.uid())`. No abierto a
  `anon`.
- **Escritura** (`INSERT`/`UPDATE`/`DELETE`) en `editions`, `people`, `activities`,
  `activity_results`, `medal_awards`: `to authenticated` con `using
  (public.has_claimed_person())` y `with check (public.has_claimed_person())`.
- **profiles escritura**: en f-010 basta con permitir al usuario gestionar su propia fila
  (`using (user_id = auth.uid()) with check (user_id = auth.uid())`) o dejarla sin
  políticas de escritura (todo denegado) y delegar la creación/edición a f-011. Elegir la
  opción más simple y dejar comentado que el trigger de creación y el flujo de reclamar
  `Person` (UPDATE de `people.claimed_by_user_id` por un usuario aún sin persona) son de
  f-011 y añadirán/ajustarán políticas entonces. **No** implementar aquí la política que
  permite reclamar persona sin tenerla todavía.

## Tests

- `src/__tests__/services/supabase.test.ts` (jest-expo):
  - Con `EXPO_PUBLIC_SUPABASE_URL`/`ANON_KEY` presentes (seteadas en el test), el módulo
    exporta un cliente definido y no lanza.
  - Sin alguna de las dos variables, importar/inicializar lanza un `Error` con mensaje
    claro (nombre de la variable). Usar `jest.resetModules()` + manipular `process.env`
    dentro del test, e importar el módulo de forma perezosa (`await import`/`require`) para
    controlar el orden de evaluación.
  - (Opcional) aserción de que el código fuente no contiene una URL `*.supabase.co`
    literal (anti-hardcode); alternativamente, verificación por revisión.
- No se testea contra Supabase real (no hay credenciales). La lectura anónima efectiva es
  verificación manual del usuario tras aplicar migraciones (ver R7).

## Edge cases / gotchas

- **`gen_random_uuid()`** requiere la extensión `pgcrypto` (activa por defecto en
  Supabase). Incluir `create extension if not exists pgcrypto;` por seguridad.
- **RLS por defecto deniega:** al activar RLS sin políticas, todo queda denegado; hay que
  crear explícitamente las `SELECT` públicas o la app anónima no verá nada.
- **`EXPO_PUBLIC_` en tests:** en jest no hay bundler de Expo; setear `process.env`
  directamente en el test. No confiar en un `.env.local` real en CI.
- **Orden de módulo:** si el cliente se crea en el nivel superior del módulo, el error por
  env ausente salta al importar; los tests deben resetear módulos entre casos.
- **`@supabase/supabase-js` en RN:** puede requerir que exista `URL`/`fetch` globales
  (los aporta React Native/Expo). No añadir polyfills salvo que un test lo exija.
- **`supabase/` versionado:** confirmar que `.gitignore` no excluye `supabase/migrations`.

## Verificación (Definition of Done)

- `npm test` verde, incluyendo el test del cliente.
- `npx tsc --noEmit` sin errores.
- Migraciones SQL presentes y revisables: seis tablas, RLS activo en todas, SELECT
  público en las cinco de consulta, escritura solo con `person_id` no nulo, nada de
  escritura para `anon`.
- `docs/tech-stack.md` actualizado con la versión de `@supabase/supabase-js`.
- Documentado el paso manual del usuario: crear el proyecto, poner `EXPO_PUBLIC_*` en
  `.env.local`, aplicar migraciones y comprobar lectura anónima.

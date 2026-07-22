# f-011-auth-google-sso — Diseño

## Resumen

Se añade autenticación Google (Supabase Auth, flujo PKCE nativo) con sesión persistida en
`AsyncStorage`, un contexto de auth global (`AuthProvider` + `useAuth`) que expone sesión,
`Profile` y la señal `canWrite`, una pantalla de login y una pantalla de onboarding
obligatoria para reclamar una `Person`. La reclamación se hace mediante una **RPC atómica
`SECURITY DEFINER`**, y se **cierra el hueco de RLS** heredado de f-010 (nota del reviewer):
ni `profiles.person_id` ni `people.claimed_by_user_id` podrán mutarse fuera de esa RPC.

## Decisiones técnicas

### 1. Flujo OAuth (PKCE nativo, sin secretos en la app)

Patrón oficial Supabase + Expo para RN: la app abre el navegador del sistema y intercambia
el `code` por sesión. No se guarda ningún secreto de Google en el cliente; el proveedor
Google se configura en el panel de Supabase (paso manual del usuario).

- `src/services/auth.ts`:
  - `signInWithGoogle()`:
    1. `redirectTo = makeRedirectUri({ scheme: 'medallerosanpedro' })` (expo-auth-session).
    2. `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo, skipBrowserRedirect: true } })` → devuelve `data.url`.
    3. `WebBrowser.openAuthSessionAsync(data.url, redirectTo)`.
    4. Si `result.type === 'success'`: parsear `result.url` con `Linking.parse` (expo-linking, ya instalado) para extraer `code`; `await supabase.auth.exchangeCodeForSession(code)`. Si `type` es `cancel`/`dismiss`, devolver `null` sin error (R1.4).
  - `signOut()` → `supabase.auth.signOut()`.
  - `getSession()` → `supabase.auth.getSession()`.
  - `onAuthStateChange(cb)` → wrapper de `supabase.auth.onAuthStateChange`.
  - Llamar `WebBrowser.maybeCompleteAuthSession()` a nivel de módulo.

### 2. Cliente Supabase con sesión persistente (modificación de `src/services/supabase.ts`)

Añadir opciones de `auth` a `createClient` y el polyfill de URL (requerido por gotrue en RN):

```ts
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
// ...
createClient(url, key, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // nativo: no hay URL de navegador que inspeccionar
    flowType: 'pkce',
  },
});
```

`AsyncStorage` ya está instalado (lo usa `ThemeProvider`) y mockeado en `jest.setup.ts`, así
que `supabase.test.ts` sigue verde. Si el import del polyfill rompiera la transformación de
Jest, añadir `react-native-url-polyfill` a `transformIgnorePatterns` (jest-expo suele
cubrirlo; verificar al correr los tests).

### 3. Servicios de datos

- `src/services/profiles.ts`:
  - `fetchMyProfile(): Promise<Profile | null>` → `select` sobre `profiles` filtrando por
    `user_id = auth.uid()` (RLS `profiles_select_own` ya lo restringe; usar
    `.maybeSingle()`), mapeando snake_case → camelCase (`user_id`→`userId`,
    `person_id`→`personId`).
- `src/services/people.ts`:
  - `listClaimablePeople(): Promise<Person[]>` → `select` sobre `people` con
    `.is('claimed_by_user_id', null)` y `.order('name')` (R3.1). Mapea a `Person`.
  - `claimPerson(personId: string): Promise<void>` → `supabase.rpc('claim_person', { target_person_id: personId })`. Traducir el error de "ya reclamada" a un error tipado/reconocible (p. ej. `PersonAlreadyClaimedError` o inspeccionar `error.code === '23505'` / mensaje) para que la UI muestre R3.2.

Mapeo snake_case↔camelCase: pequeñas funciones locales por servicio (sin capa genérica
prematura, conforme a `docs/conventions.md`).

### 4. Contexto de auth (`src/context/AuthContext.tsx`)

Nuevo layer `src/context/` (hoy solo `.gitkeep`), siguiendo el patrón de `ThemeProvider`
(context + hook con guardia). Es un estado transversal legítimo (sesión global), no una
abstracción prematura.

`AuthProvider`:
- Estado: `session: Session | null`, `profile: Profile | null`, `loading: boolean`.
- Al montar: `getSession()`, luego `fetchMyProfile()` si hay sesión; suscribirse a
  `onAuthStateChange` para refrescar sesión y perfil (login/logout/refresh).
- Expone vía `useAuth()`:
  - `session`, `user` (`session?.user ?? null`), `profile`, `loading`.
  - `isAuthenticated: boolean` (`!!session`).
  - `hasClaimedPerson: boolean` (`!!profile?.personId`).
  - `canWrite: boolean` (= `isAuthenticated && hasClaimedPerson`) — señal R4.3 para features
    de escritura futuras.
  - `signInWithGoogle()`, `signOut()`, `refreshProfile()` (para llamar tras reclamar).
- `useAuth()` lanza si se usa fuera del provider (igual que `useTheme`).

### 5. Pantallas y gating (Expo Router, `src/app/`)

- `src/app/_layout.tsx` (modificar): envolver el árbol con `<AuthProvider>` **dentro** de
  `<ThemeProvider>`; añadir un `<AuthGate>` que controle el redireccionamiento. Declarar en
  el `Stack` las nuevas rutas `sign-in` y `claim-person` (presentación modal opcional).
- `AuthGate` (componente en el mismo `_layout.tsx` o `src/components/`):
  - Usa `useAuth()` + `useRouter()` + `useSegments()` de expo-router.
  - Mientras `loading` → no redirige (deja el splash / render nulo).
  - Si `isAuthenticated && !hasClaimedPerson` y la ruta actual no es `claim-person` →
    `router.replace('/claim-person')` (R2.2, bloqueo del resto de la app).
  - Si el usuario está en `claim-person` pero ya reclamó (o no hay sesión) → sacarlo de ahí
    (`router.replace('/')`).
  - Sin sesión → no se fuerza login (modo anónimo permitido; la navegación pública completa
    es f-012).
- `src/app/sign-in.tsx` (nuevo): pantalla con `Screen` + botón `Button` "Continuar con
  Google" (única opción, R1.1/R1.3) que llama `signInWithGoogle()`; estado de carga y manejo
  de cancelación (R1.4). Al lograr sesión, el `AuthGate` decide el destino.
- `src/app/claim-person.tsx` (nuevo): carga `listClaimablePeople()`, lista seleccionable
  (usando `ListRow`/`Card` existentes), botón confirmar → `claimPerson(id)` → `refreshProfile()`
  → el gate desbloquea. Maneja R3.2 (persona ya reclamada: mensaje + recarga de la lista) y
  el estado vacío (`EmptyState`). Sin botón de "volver"/cerrar que permita saltarse el paso;
  ofrece "Cerrar sesión" como única salida alternativa.
- `src/app/index.tsx` (modificar mínimamente): mostrar un punto de entrada al login
  ("Iniciar sesión con Google" → `/sign-in`) cuando no hay sesión, y un resumen de cuenta +
  "Cerrar sesión" cuando la hay. No se construye aquí la navegación pública de f-012.

### 6. Migración SQL — `supabase/migrations/20260719130000_auth_claim_person.sql`

Cuatro piezas (todas idempotentes donde aplica):

1. **Auto-creación de Profile** (R2.1): `handle_new_user()` `SECURITY DEFINER` que hace
   `insert into public.profiles (user_id, email) values (new.id, new.email) on conflict (user_id) do nothing;`
   + trigger `after insert on auth.users`.

2. **Protección de `claimed_by_user_id`** (R4.4): `protect_person_claim()` trigger
   `before insert or update on public.people` que lanza excepción si
   `new.claimed_by_user_id is distinct from old.claimed_by_user_id` (en `UPDATE`) o si
   `new.claimed_by_user_id is not null` (en `INSERT`, donde `old` no existe) **salvo** que
   `current_setting('app.claiming', true) = 'on'` (flag transaccional que solo activa la
   RPC). Esto impide que el CRUD general de `people` (política `people_write_claimed_person`,
   feature f-001, que es `for all`) reasigne/robe reclamaciones tanto por `UPDATE` como por
   `INSERT` directo.

   > **Desviación sobre la primera versión de este diseño** (hallazgo de revisión R4.4): el
   > trigger se declaró inicialmente solo `before update`, dejando abierto un `INSERT` directo
   > con `claimed_by_user_id` arbitrario para cualquier usuario que ya tuviera `Person`
   > reclamada (`has_claimed_person() = true`). Se amplía a `before insert or update` y la
   > función distingue `tg_op` porque `old` no está asignado en un trigger de `INSERT`.

3. **RPC atómica** `claim_person(target_person_id uuid)` `SECURITY DEFINER` (R5.1):
   - `if auth.uid() is null then raise exception ... using errcode = '42501';`
   - `insert into profiles (user_id) values (auth.uid()) on conflict do nothing;` (defensivo).
   - `select person_id ...` del profile propio; si no es nulo → `raise` (R3.3).
   - `perform set_config('app.claiming', 'on', true);` (transaccional).
   - `update people set claimed_by_user_id = auth.uid() where id = target and claimed_by_user_id is null;`
     `if not found then raise exception 'Esa persona ya ha sido reclamada' using errcode = '23505'; end if;` (R3.2/R5.1).
   - `update profiles set person_id = target where user_id = auth.uid();`
   - `revoke ... from public, anon; grant execute ... to authenticated;`
   - Como corre en una sola transacción y `SECURITY DEFINER` (bypassa RLS), fija ambas
     columnas atómicamente (R2.4).

4. **Cierre del hueco `profiles_write_own`** (R4.4): `drop policy if exists "profiles_write_own"
   on public.profiles;`. No se recrea ninguna política de escritura directa sobre `profiles`:
   las filas las crea el trigger y `person_id` solo lo fija la RPC (ambos `SECURITY DEFINER`,
   bypassan RLS). Se conserva `profiles_select_own`.

> Nota: el helper `has_claimed_person()` y las políticas de escritura de las 5 tablas de
> dominio ya existen en la migración de f-010 y **no** cambian; f-011 solo añade el trigger de
> Profile, el trigger de protección, la RPC y elimina `profiles_write_own`.

### 7. Dependencias nuevas (package.json)

`expo-auth-session`, `expo-web-browser`, `expo-crypto` (peer para PKCE de auth-session),
`react-native-url-polyfill`. `@react-native-async-storage/async-storage` y `expo-linking` ya
están. Instalar con `npx expo install <pkg>` para fijar versiones compatibles con SDK 57.
No se necesita `expo-web-browser`/`expo-auth-session` como plugin en `app.json`; el `scheme`
`medallerosanpedro` ya está declarado.

## Modelo de datos

No cambia el esquema de tablas de f-010 (los tipos `Profile`/`Person` de
`src/types/domain.ts` ya contemplan `personId`/`claimedByUserId`). f-011 añade
comportamiento (triggers, RPC) y ajusta políticas RLS.

## Estrategia de test

Sin BBDD real; foco en lógica de servicios y contexto (mock de `supabase`), patrón de
`supabase.test.ts` (mock de `@supabase/supabase-js`, `jest.resetModules`):
- `src/__tests__/services/auth.test.ts`: `signInWithGoogle` construye `redirectTo`, llama
  `signInWithOAuth` + `openAuthSessionAsync`, e intercambia el `code` en éxito; devuelve
  `null` en cancelación; `signOut` delega en supabase. Mock de `expo-web-browser`,
  `expo-auth-session`, `expo-linking`.
- `src/__tests__/services/people.test.ts`: `listClaimablePeople` filtra
  `claimed_by_user_id is null` y mapea a `Person`; `claimPerson` invoca
  `rpc('claim_person', { target_person_id })` y traduce el error de "ya reclamada".
- `src/__tests__/context/AuthContext.test.tsx`: con perfil sin `personId` →
  `hasClaimedPerson`/`canWrite` false; con `personId` → true; `useAuth` fuera del provider
  lanza.
- **RLS/RPC/atomicidad**: no se ejecuta Postgres en CI; se verifica por **revisión** del SQL
  (RPC atómica, guard de `claimed_by_user_id`, `profiles_write_own` eliminada) y por
  **verificación manual del usuario** documentada en `supabase/README.md` (dos escenarios:
  usuario sin persona no puede escribir; carrera de reclamación deja una sola ganadora).
  Consistente con cómo f-010 trató las políticas RLS.

Recordatorio RNTL 14: `await render(...)` (render asíncrono), ver `docs/conventions.md`.

## Riesgos / notas para el usuario

- Configurar el proveedor **Google** en Supabase Auth (Client ID/Secret de Google Cloud) y
  registrar las **redirect URLs** (incluido el deep link `medallerosanpedro://`) — paso
  manual, no lo hace el agente. Documentar en `supabase/README.md`.
- Aplicar la nueva migración `20260719130000_auth_claim_person.sql`.
- `.env.local` sigue necesitando `EXPO_PUBLIC_SUPABASE_ANON_KEY` (hoy vacía) para que el
  login funcione en ejecución real.

## Desviaciones respecto al diseño original (implementación)

- **`app.json` sí terminó con el plugin `expo-web-browser`**: el diseño asumía que no haría
  falta declarar plugin para `expo-web-browser`/`expo-auth-session`, pero `npx expo install
  expo-web-browser` añadió automáticamente `"expo-web-browser"` a `expo.plugins` (config
  plugin propio del paquete, sin opciones). Se deja tal cual: es un efecto estándar de
  `expo install` para paquetes con config plugin, no una decisión manual del agente, y no
  requiere configuración adicional.
- **`react-native-url-polyfill/auto` no rompió ningún test**: al correr `supabase.test.ts`
  tras añadir el import en `src/services/supabase.ts`, siguió en verde sin tocar
  `transformIgnorePatterns` de Jest (contingencia prevista en la sección 2, finalmente no
  necesaria).
- **`.env.local` ya contenía credenciales reales** (`EXPO_PUBLIC_SUPABASE_URL` y
  `EXPO_PUBLIC_SUPABASE_ANON_KEY`) al empezar la implementación, a diferencia de lo que
  suponía la nota de riesgos original ("hoy vacía"); no cambia nada del código, solo la nota
  queda desactualizada. Sigue sin usarse ningún valor real en tests: `auth.test.ts`,
  `people.test.ts`, `AuthContext.test.tsx` e `index.test.tsx` mockean `@/services/supabase`,
  `@/services/auth`, `@/services/profiles` o `@/context/AuthContext` según el nivel que
  cubren, para no depender de esas variables de entorno ni de red real.
- **`src/__tests__/app/index.test.tsx` (existente de f-000) se amplió**: al añadir `useAuth()`
  a `HomeScreen`, el test previo dejó de poder renderizarse solo con `<ThemeProvider>` (needs
  `AuthProvider`, que a su vez requiere las variables de entorno de Supabase reales para
  instanciar el cliente). Se mockeó `@/context/AuthContext` en ese test en lugar de envolver
  con `<AuthProvider>` real, siguiendo el mismo principio de no depender de red/env en tests
  de UI puramente presentacionales.

# f-011-auth-google-sso — Tareas

Checklist ordenado. El implementer marca `- [x]` un item a la vez (nunca en bloque).
Referencia: `requirements.md` (EARS) y `design.md`.

## Backend (SQL)

- [x] Crear migración `supabase/migrations/20260719130000_auth_claim_person.sql` con el trigger `handle_new_user()` de auto-creación de Profile al alta en `auth.users` (R2.1)
- [x] Añadir en la misma migración el trigger `protect_person_claim()` (`before update on people`) que bloquea cambios de `claimed_by_user_id` fuera de la RPC vía flag `app.claiming` (R4.4)
- [x] Añadir en la misma migración la RPC `claim_person(target_person_id uuid)` `SECURITY DEFINER` atómica con validaciones y `UPDATE ... WHERE claimed_by_user_id IS NULL` guardado, más `revoke/grant` (R2.4, R3.2, R3.3, R5.1)
- [x] Eliminar la política `profiles_write_own` en la misma migración (cierre del hueco de f-010), conservando `profiles_select_own` (R4.4)

## Dependencias y cliente

- [x] Instalar `expo-auth-session`, `expo-web-browser`, `expo-crypto`, `react-native-url-polyfill` con `npx expo install` (versiones SDK 57)
- [x] Modificar `src/services/supabase.ts`: import de `react-native-url-polyfill/auto` + opciones `auth` (AsyncStorage, persistSession, autoRefreshToken, detectSessionInUrl false, flowType pkce), verificando que `supabase.test.ts` sigue verde (R1.2, R1.5)

## Servicios

- [x] Crear `src/services/auth.ts` (`signInWithGoogle`, `signOut`, `getSession`, `onAuthStateChange`, `maybeCompleteAuthSession`) con flujo PKCE + WebBrowser (R1.1–R1.6)
- [x] Crear `src/services/profiles.ts` (`fetchMyProfile` con mapeo snake_case→camelCase) (R2.1)
- [x] Crear `src/services/people.ts` (`listClaimablePeople` filtrando `claimed_by_user_id is null`; `claimPerson` vía `rpc('claim_person')` con traducción del error de "ya reclamada") (R3.1, R3.2, R2.4)

## Contexto de sesión

- [x] Crear `src/context/AuthContext.tsx` (`AuthProvider` + `useAuth`) exponiendo `session/user/profile/loading/isAuthenticated/hasClaimedPerson/canWrite/signInWithGoogle/signOut/refreshProfile`, suscrito a `onAuthStateChange` (R4.2, R4.3)

## Pantallas y gating

- [x] Modificar `src/app/_layout.tsx`: envolver con `<AuthProvider>` dentro de `<ThemeProvider>`, declarar rutas `sign-in` y `claim-person`, e implementar `AuthGate` que fuerza `claim-person` mientras `personId` sea nulo (R2.2)
- [x] Crear `src/app/sign-in.tsx` (botón único "Continuar con Google", carga, cancelación) (R1.1, R1.3, R1.4)
- [x] Crear `src/app/claim-person.tsx` (lista de personas reclamables, confirmar → `claimPerson` → `refreshProfile`, manejo de "ya reclamada" y estado vacío, salida solo por cerrar sesión) (R2.3, R2.4, R3.2)
- [x] Modificar `src/app/index.tsx`: entrada a `/sign-in` sin sesión y resumen de cuenta + "Cerrar sesión" con sesión (R1.1, R1.6)

## Tests

- [x] `src/__tests__/services/auth.test.ts` (flujo Google, éxito/cancelación, signOut) con mocks de expo-web-browser/auth-session/linking
- [x] `src/__tests__/services/people.test.ts` (`listClaimablePeople` filtra no reclamadas; `claimPerson` invoca la RPC y traduce el error) (R3.1, R3.2)
- [x] `src/__tests__/context/AuthContext.test.tsx` (`hasClaimedPerson`/`canWrite` derivados de `personId`; `useAuth` fuera de provider lanza) (R4.2, R4.3)
- [x] `src/__tests__/services/profiles.test.ts` (`fetchMyProfile`: mapeo snake_case→camelCase, sesión nula, propagación de error) — bloqueante del reviewer, `docs/conventions.md` L17 (R2.1)

## Documentación / cierre

- [x] Actualizar `supabase/README.md` con los pasos manuales del usuario (configurar proveedor Google + redirect URLs, aplicar la nueva migración) y los dos escenarios de verificación manual de RLS/reclamación
- [x] Verificar `npm test` (todos verdes) y `npm run typecheck` (limpio) antes de pasar a revisión

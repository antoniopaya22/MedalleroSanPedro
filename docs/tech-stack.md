# Stack técnico

## Estado

Proyectos EAS y Supabase ya registrados (ver secciones siguientes). El proyecto Expo se
arrancó en `f-000-project-bootstrap` (rutas bajo `src/app`, TypeScript estricto, alias
`@/*`, jest-expo + RNTL). Este documento se sigue actualizando con versiones reales
conforme se instale cada paquete nuevo.

## Proyecto Expo (EAS)

- Slug: `medallerosanpedro`
- Owner: `payarroni`
- Project ID: `19176f10-94cd-4746-abc3-171ef40e2218`

## Versiones instaladas (f-000-project-bootstrap)

- Expo SDK: `57.0.0` (paquete `expo` `57.0.7`)
- Expo Router: `57.0.7`
- React Native: `0.86.0`
- React: `19.2.3` / React DOM: `19.2.3`
- TypeScript: `6.0.3` (`strict: true`)
- Testing: `jest-expo` `57.0.2` + `jest` `29.7.0` + `@testing-library/react-native` `14.0.1`
  (RNTL 14, `render`/`rerender` asíncronos)
- Otros paquetes de Expo instalados: `expo-constants` `57.0.6`, `expo-linking` `57.0.3`,
  `expo-splash-screen` `57.0.4`, `expo-status-bar` `57.0.1`, `expo-system-ui` `57.0.1`,
  `react-native-safe-area-context` `5.7.0`, `react-native-screens` `4.25.2`,
  `react-native-web` `0.21.2`.
- Validado con `npx expo-doctor` (20/20 checks) y `npx expo export` (web y android).

## Versiones instaladas (f-010-supabase-setup)

- `@supabase/supabase-js`: `2.110.7` (cliente en `src/services/supabase.ts`; sin
  adaptador de sesión/AsyncStorage todavía, eso llega con `f-011-auth-google-sso`).

## Objetivo

- Expo (SDK actual estable en el momento del bootstrap) + Expo Router.
- React Native + React (versiones que traiga el SDK de Expo elegido).
- TypeScript estricto.
- Backend: Supabase (Auth con Google SSO + Postgres) como única fuente de verdad — ver [decisions/0001-supabase-backend.md](decisions/0001-supabase-backend.md) y [decisions/0002-google-sso-person-claim.md](decisions/0002-google-sso-person-claim.md). Cliente: `@supabase/supabase-js`. Login: `expo-auth-session` + proveedor Google OAuth configurado en Supabase Auth.
- Testing: `jest-expo` + React Native Testing Library.

## Supabase

- Project: `MedalleroSanPedro`, ref `oqowldchsqlvddumwbap`, región `eu-west-1` (West EU, Ireland). Proyecto propio, independiente del de ViajaPayá.
- Auth: Google SSO exclusivamente (sin email/password, sin otros proveedores por ahora) vía Supabase Auth — proveedor Google todavía por configurar en el dashboard (Authentication → Providers → Google) como parte de `f-011-auth-google-sso`.
- Credenciales (URL, anon key, contraseña de BBDD, y las credenciales OAuth de Google — Client ID/Secret) viven solo en `.env.local` (gitignored) — ver `.env.example` para la plantilla. Nunca en código ni en docs. Pendiente: rellenar `.env.local` con la URL y anon key reales (Project Settings → API del dashboard de Supabase).

## Paquetes previstos (no instalados aún, a añadir cuando la feature correspondiente los necesite)

- Auth Google SSO: `expo-auth-session`, `expo-crypto` (o el flujo nativo que recomiende Supabase Auth para Expo en el momento de `f-011`).
- Selección de fecha (fecha de una `ActivityResult`): `@react-native-community/datetimepicker`.

Cada paquete se añade y se documenta (versión, motivo) cuando su feature asociada entra en `in-progress`, no antes.

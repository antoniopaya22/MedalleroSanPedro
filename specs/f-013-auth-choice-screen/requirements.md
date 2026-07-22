# f-013 — Pantalla previa de elección de sesión (Google o invitado) · Requisitos (EARS)

## Contexto

Al abrir la app sin sesión y sin que el usuario haya elegido ya "invitado" en la sesión
actual de la app, se muestra una pantalla de bienvenida (gate de entrada, pantalla completa
tipo onboarding) **antes** de llegar al home, con dos opciones explícitas:

1. **Iniciar sesión con Google** — dispara el flujo OAuth ya existente de f-011.
2. **Continuar como invitado** — entra al home en modo lectura pública de f-012, sin
   autenticar.

Esta feature **no reimplementa** el OAuth (f-011, done) ni el modo lectura pública (f-012,
done): solo añade la pantalla de elección previa. Depende de:

- `f-011-auth-google-sso` (done): `src/context/AuthContext.tsx` expone
  `signInWithGoogle(): Promise<Session | null>` (devuelve `null` si el usuario cancela, sin
  lanzar), `signOut()`, `isAuthenticated`, `hasClaimedPerson`, `canWrite` y `loading`. El
  `AuthGate` de `src/app/_layout.tsx` ya redirige a `/claim-person` cuando hay sesión sin
  `Person` reclamada.
- `f-012-public-readonly-mode` (done): navegar sin sesión (modo lectura pública) ya funciona
  en toda la app; el `AuthGate` no fuerza login cuando no hay sesión.

El "branding oficial de Google" se rige por las Google Identity Guidelines para el botón de
"Sign in with Google" (logo multicolor de la "G", fondo claro/blanco con borde o azul de
marca, tipografía sans-serif, no un icono monocromo genérico).

## R1 — Gate de bienvenida antes del home (AC1)

- R1.1 — CUANDO la app termina de cargar (sesión y fuentes resueltas) y **no** hay sesión
  activa **y** el usuario **no** ha elegido "invitado" en la sesión actual de la app, EL
  SISTEMA DEBERÁ mostrar la pantalla de bienvenida (`/welcome`) antes de permitir el acceso
  al home y al resto de rutas.
- R1.2 — MIENTRAS el estado de carga (`loading`) o las fuentes no estén resueltos, EL SISTEMA
  DEBERÁ mostrar el indicador de carga existente (`AppLoading`) y NO decidir todavía el
  destino de navegación, para no parpadear entre el splash y la pantalla de bienvenida.
- R1.3 — CUANDO un visitante sin sesión y sin elección de invitado intenta navegar
  directamente a una ruta distinta de `/welcome` (y distinta de `/sign-in`), EL SISTEMA
  DEBERÁ redirigirlo a `/welcome` en lugar de mostrar esa ruta.
- R1.4 — La pantalla de bienvenida DEBERÁ coexistir con el gate de reclamación de `Person`
  sin romperlo: la regla de redirigir a `/claim-person` cuando hay sesión sin `Person`
  reclamada (f-011) tiene precedencia sobre el gate de bienvenida (que solo aplica a
  visitantes sin sesión).

## R2 — Botón de Google con branding oficial (AC2)

- R2.1 — CUANDO se muestra la pantalla de bienvenida, EL SISTEMA DEBERÁ renderizar un botón
  de "Iniciar sesión con Google" que siga las Google Identity Guidelines: logo oficial
  multicolor de la "G" de Google (azul `#4285F4`, verde `#34A853`, amarillo `#FBBC05`, rojo
  `#EA4335`), fondo claro (blanco `#FFFFFF`) con borde de marca, y etiqueta en tipografía
  sans-serif.
- R2.2 — El botón de Google NO DEBERÁ ser un botón genérico de la app con un icono monocromo
  cualquiera (p. ej. el glyph `logo-google` de Ionicons); debe ser reconocible como el botón
  oficial de Google Sign-In.
- R2.3 — El botón DEBERÁ ser accesible: rol `button` y etiqueta accesible en español
  ("Iniciar sesión con Google" o "Continuar con Google").

## R3 — Continuar como invitado (AC3)

- R3.1 — CUANDO el usuario pulsa "Continuar como invitado" en la pantalla de bienvenida, EL
  SISTEMA DEBERÁ registrar la elección de invitado para la sesión actual de la app y navegar
  al home (`/`) en modo lectura pública, SIN disparar el flujo de login de Google.
- R3.2 — CUANDO el usuario ha continuado como invitado, EL SISTEMA DEBERÁ dejarle navegar por
  el resto de la app en modo lectura pública (f-012) sin volver a interponer la pantalla de
  bienvenida.

## R4 — Iniciar sesión con Google (AC4)

- R4.1 — CUANDO el usuario pulsa "Iniciar sesión con Google" en la pantalla de bienvenida, EL
  SISTEMA DEBERÁ disparar el flujo OAuth ya existente de f-011 (`signInWithGoogle()` de
  `AuthContext`), sin reimplementarlo.
- R4.2 — CUANDO el login con Google se completa con éxito, EL SISTEMA DEBERÁ dejar que el
  `AuthGate` decida el destino: `/claim-person` si el `Profile` aún no tiene `Person`
  reclamada, o el home si ya la tiene; la pantalla de bienvenida NO DEBERÁ volver a mostrarse.
- R4.3 — CUANDO el usuario cancela o cierra el flujo de Google (`signInWithGoogle()` devuelve
  `null`), EL SISTEMA DEBERÁ permanecer en la pantalla de bienvenida sin error bloqueante.
- R4.4 — SI el flujo de Google lanza un error, EL SISTEMA DEBERÁ mostrar un mensaje de error
  legible en español en la propia pantalla de bienvenida y permitir reintentar.

## R5 — No repetir la pantalla en la misma sesión (AC5)

- R5.1 — CUANDO ya existe una sesión iniciada (`isAuthenticated`), EL SISTEMA DEBERÁ NO
  mostrar la pantalla de bienvenida (ni redirigir a ella).
- R5.2 — CUANDO el usuario ya eligió "invitado" en la sesión actual de la app, EL SISTEMA
  DEBERÁ NO volver a mostrar la pantalla de bienvenida mientras la app siga abierta.
- R5.3 — CUANDO la app se reabre desde cero (arranque en frío), EL SISTEMA DEBERÁ tratar la
  elección de invitado como no realizada (el estado es solo en memoria de la sesión de la
  app, no persistido en disco), de modo que un visitante sin sesión vuelve a ver la pantalla
  de bienvenida.
- R5.4 — CUANDO un usuario autenticado cierra sesión (`signOut`), EL SISTEMA DEBERÁ descartar
  cualquier elección de invitado previa, de modo que vuelva a mostrarse la pantalla de
  bienvenida (queda sin sesión y sin elección de invitado).

## Fuera de alcance

- El flujo OAuth en sí (intercambio de tokens, deep link, sesión de Supabase): es f-011, ya
  hecho; esta feature solo lo invoca vía `signInWithGoogle()`.
- El gating de escritura y la ocultación de controles (`WriteGate`, RLS): es f-012/f-010.
- La reorganización de la navegación por tabs (f-014) y cualquier cambio en la barra inferior:
  esta feature toca el `AuthGate` de `_layout.tsx` y añade la ruta `/welcome`, pero no
  reestructura el `Stack`.
- Persistir la elección de invitado entre reinicios de la app (se decide explícitamente NO
  hacerlo; ver `design.md`).

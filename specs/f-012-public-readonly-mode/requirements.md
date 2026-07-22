# f-012 — Modo de solo lectura sin inicio de sesión · Requisitos (EARS)

## Contexto

Cualquier visitante sin sesión puede navegar por ediciones, actividades, resultados y
rankings sin iniciar sesión. Las acciones de escritura (crear/editar/registrar) quedan
ocultas y bloqueadas para visitantes anónimos y para usuarios autenticados que aún no han
reclamado su `Person`. Se ofrece un punto de entrada claro para iniciar sesión con Google.

Depende de `f-011-auth-google-sso` (done), que ya expone en `src/context/AuthContext.tsx`
las señales `isAuthenticated`, `hasClaimedPerson` y `canWrite` (= `isAuthenticated &&
hasClaimedPerson`), y cuyo `AuthGate` (en `src/app/_layout.tsx`) ya **no** fuerza login sin
sesión. Depende también de `f-010-supabase-setup` (done), cuyas políticas RLS ya conceden
`SELECT` público (rol `anon`) sobre `editions`, `people`, `activities`, `activity_results`
y `medal_awards`.

Esta feature es transversal: aporta el **mecanismo de gating de escritura reutilizable** y
el **punto de entrada al login en modo público**, que las features de navegación y
escritura (f-001..f-008) consumirán. No implementa los listados/rankings concretos.

## R1 — Acceso anónimo de solo lectura (AC1)

- R1.1 — CUANDO un visitante sin sesión abre la app, EL SISTEMA DEBERÁ mostrar el contenido
  de navegación (la pantalla de inicio y, a medida que existan, los listados de ediciones,
  actividades, resultados y rankings) sin redirigirlo a `/sign-in`.
- R1.2 — CUANDO no hay sesión activa, EL SISTEMA DEBERÁ NO forzar la navegación a `/sign-in`
  ni a `/claim-person`; el `AuthGate` solo redirige a `/claim-person` cuando hay sesión sin
  `Person` reclamada.
- R1.3 — CUANDO un visitante sin sesión (rol `anon`) consulta datos de lectura, EL SISTEMA
  DEBERÁ permitir el `SELECT` sobre `editions`, `people`, `activities`, `activity_results` y
  `medal_awards` mediante las políticas RLS de lectura pública ya existentes, sin requerir
  autenticación.

## R2 — Ocultación y bloqueo de controles de escritura (AC2)

- R2.1 — CUANDO un visitante sin sesión visualiza cualquier pantalla, EL SISTEMA DEBERÁ NO
  renderizar ningún control de escritura (crear, editar, registrar o eliminar).
- R2.2 — CUANDO un usuario autenticado que todavía no ha reclamado su `Person` visualiza
  cualquier pantalla, EL SISTEMA DEBERÁ NO renderizar ningún control de escritura (mismo
  trato que un visitante anónimo respecto a la escritura).
- R2.3 — CUANDO un usuario autenticado con su `Person` reclamada (`canWrite === true`)
  visualiza una pantalla con controles de escritura, EL SISTEMA DEBERÁ renderizar dichos
  controles.
- R2.4 — EL SISTEMA DEBERÁ ofrecer un mecanismo de UI reutilizable (`WriteGate`) que envuelva
  cualquier control de escritura y decida su visibilidad a partir de `canWrite`, de modo que
  las features f-001..f-008 apliquen el gating de forma uniforme y no dupliquen la condición.
- R2.5 — La ocultación de controles en la UI es defensa en profundidad; la garantía real de
  que un anónimo (o autenticado sin `Person` reclamada) no puede escribir la aportan las
  políticas RLS de f-010 (`for all to authenticated using has_claimed_person()`), no la
  ausencia del botón. Ninguna acción de escritura debe depender solo del gating de UI.

## R3 — Punto de entrada al inicio de sesión desde el modo público (AC3)

- R3.1 — CUANDO un visitante sin sesión está en el modo público, EL SISTEMA DEBERÁ ofrecer un
  punto de entrada claro y accesible para iniciar sesión con Google.
- R3.2 — CUANDO el visitante activa ese punto de entrada, EL SISTEMA DEBERÁ llevarlo al flujo
  de inicio de sesión con Google (`/sign-in`, definido en f-011).
- R3.3 — CUANDO ya existe una sesión iniciada, EL SISTEMA DEBERÁ NO mostrar el punto de
  entrada de inicio de sesión, sino el estado de cuenta (p. ej. opción de cerrar sesión).

## Fuera de alcance

- Los listados y rankings concretos (ediciones f-002, ranking de edición f-005, histórico
  f-006, por actividad f-007) y los controles de escritura reales (f-001..f-004): cada una
  de esas features envolverá sus controles de escritura en `WriteGate` y mostrará el punto de
  entrada al login del modo público cuando corresponda.
- Cambios de esquema o de políticas RLS: f-010 ya concede lectura pública `anon` a las cinco
  tablas y bloquea toda escritura para `anon`. Esta feature verifica y se apoya en ellas; no
  crea migraciones salvo que se detecte un hueco.

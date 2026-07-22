# f-014 — Navegación principal por pestañas inferiores con acceso rápido a registro · Requisitos (EARS)

## Contexto

Hoy la navegación principal es un `Stack` plano con un home (`src/app/index.tsx`) que
enumera, como tarjetas (`NavCard`), los accesos a: Ediciones, Personas, Actividades (catálogo),
los tres rankings (histórico, por edición, por actividad) y "Registrar resultado". Esta feature
**sustituye ese home plano por una barra de pestañas inferior (bottom tabs)** con 3 pestañas y
un botón central elevado (FAB) de acceso rápido al registro de resultados.

Esta feature **solo reorganiza la navegación**: NO reimplementa ni cambia la lógica de los
listados, rankings ni del registro ya existentes (f-001, f-002, f-004, f-005, f-006, f-007),
que ya están `done`. Depende de que esas pantallas existan y sean navegables por URL.

Dependencias relevantes (todas `done`):

- `src/app/_layout.tsx` — `Stack` raíz con `AuthGate` (exportado) que gestiona: redirect a
  `/claim-person` si hay sesión sin `Person` reclamada (precedencia), redirect a `/welcome` si
  no hay sesión ni elección de invitado, y salida de `/welcome` al home cuando corresponde.
- `src/context/AuthContext.tsx` — `useAuth()` expone `isAuthenticated`, `hasClaimedPerson`,
  `canWrite` (`isAuthenticated && hasClaimedPerson`), `guestChosen`, `signOut`, etc.
- Rutas existentes navegables por URL: `/editions`, `/editions/new`, `/editions/[id]`,
  `/people`, `/people/new`, `/people/[id]`, `/activities`, `/activities/new`, `/activities/[id]`,
  `/results/new`, `/rankings/editions`, `/rankings/editions/[id]`, `/rankings/historic`,
  `/rankings/activities`, `/rankings/activities/[id]`.
- Tema `src/theme` (paleta cálida trigo/terracota, `colors.primary` = wheat, `colors.accent` =
  terracota, `colors.gradientFrom→gradientTo`), componentes en `src/components/ui`.

Las tres pestañas son: **Ediciones**, **Clasificaciones** (agrupa los tres rankings) y
**Participantes** (el roster de personas).

## R1 — Barra de pestañas inferior con 3 pestañas (AC1)

- R1.1 — CUANDO el usuario está en la navegación principal de la app (con acceso concedido por
  el `AuthGate`: autenticado con `Person` reclamada, o invitado), EL SISTEMA DEBERÁ mostrar una
  barra de pestañas inferior con exactamente tres pestañas: **Ediciones**, **Clasificaciones** y
  **Participantes**.
- R1.2 — Cada pestaña DEBERÁ mostrar un icono y una etiqueta, con estilo acorde al tema visual
  de la app (paleta cálida trigo/terracota de `src/theme/colors.ts`): color activo derivado de
  `colors.primary`, color inactivo derivado de `colors.textTertiary`/`textSecondary`, fondo de
  la barra `colors.surface` y separación superior `colors.border`.
- R1.3 — CUANDO el usuario pulsa una pestaña, EL SISTEMA DEBERÁ mostrar la pantalla raíz de esa
  pestaña: la pestaña Ediciones muestra el listado de ediciones existente, la pestaña
  Participantes muestra el listado de personas existente, y la pestaña Clasificaciones muestra
  una pantalla intermedia (hub) con acceso a los tres rankings (ver R3).
- R1.4 — La barra de pestañas DEBERÁ respetar el área segura inferior del dispositivo
  (safe-area bottom inset), sin quedar tapada por el gesto/indicador del sistema.

## R2 — Botón central elevado (+) de registro rápido (AC2)

- R2.1 — CUANDO se muestra la barra de pestañas, EL SISTEMA DEBERÁ mostrar en el centro de la
  barra un botón elevado (FAB) con icono `+`, visualmente destacado sobre las pestañas
  (elevación/sombra, forma circular, color de acento del tema — `colors.accent` o gradiente
  `gradientFrom→gradientTo`).
- R2.2 — El botón `+` DEBERÁ ser visible de forma idéntica en las tres pestañas (Ediciones,
  Clasificaciones y Participantes), por estar integrado en la barra compartida.
- R2.3 — El botón `+` DEBERÁ ser accesible: rol `button` y etiqueta accesible en español
  (p. ej. "Registrar resultado").

## R3 — La pestaña Clasificaciones agrupa los tres rankings (AC3)

- R3.1 — CUANDO el usuario está en la pestaña Clasificaciones, EL SISTEMA DEBERÁ mostrar una
  pantalla intermedia (hub/menú) con tres accesos claramente diferenciados: **Clasificación
  histórica**, **Clasificación por edición** y **Clasificación por actividad**.
- R3.2 — CUANDO el usuario pulsa uno de esos tres accesos, EL SISTEMA DEBERÁ navegar a la
  pantalla de ranking ya existente correspondiente (`/rankings/historic`,
  `/rankings/editions`, `/rankings/activities`) SIN duplicar ni reimplementar su lógica.
- R3.3 — El hub de Clasificaciones DEBERÁ ser accesible sin iniciar sesión (modo lectura
  pública), igual que los rankings que agrupa.

## R4 — El botón (+) respeta el permiso de escritura (AC4)

- R4.1 — CUANDO el usuario pulsa el botón `+` **y** tiene permiso de escritura (`canWrite`: está
  autenticado y con `Person` reclamada), EL SISTEMA DEBERÁ abrir el flujo de registrar resultado
  (`/results/new`).
- R4.2 — CUANDO el usuario pulsa el botón `+` **y** NO tiene permiso de escritura (invitado /
  sin sesión, o autenticado sin `Person` reclamada), EL SISTEMA DEBERÁ, en lugar de abrir el
  formulario, llevarle a un punto de inicio de sesión / onboarding (`/sign-in`), manteniendo el
  botón visible.
- R4.3 — El botón `+` DEBERÁ permanecer **visible** en ambos casos (con y sin `canWrite`); la
  diferencia está únicamente en el destino de la acción, no en su visibilidad.
- R4.4 — Esta capa de UI NO sustituye a la garantía real de permisos: la pantalla `/results/new`
  ya existente mantiene su propia comprobación de `canWrite` y la política RLS sigue siendo la
  garantía de que un usuario sin `Person` reclamada no puede escribir (defensa en profundidad).

## R5 — Las pantallas de detalle siguen accesibles como stack dentro de su pestaña (AC5)

- R5.1 — CUANDO el usuario navega desde una pestaña a una pantalla de detalle o edición de esa
  misma sección (detalle/edición de edición, de persona, o un ranking concreto por edición o por
  actividad), EL SISTEMA DEBERÁ presentarla como una navegación de tipo stack dentro de esa
  pestaña, conservando el `AuthGate` y el header propio de cada pantalla (título, botón atrás).
- R5.2 — Las pantallas de alta/edición que hoy son modales (`/editions/new`, `/people/new`) y el
  registro de resultado (`/results/new`) DEBERÁN seguir presentándose de forma modal y conservar
  su comportamiento actual (incluida la comprobación de `canWrite` y las redirecciones tras
  guardar).
- R5.3 — La reorganización en pestañas NO DEBERÁ romper el `AuthGate`: se mantienen la
  precedencia de `/claim-person`, el gate de `/welcome` y el modo lectura pública; un visitante
  sin sesión que aún no ha elegido invitado sigue viendo `/welcome` antes de las pestañas.
- R5.4 — La reorganización NO DEBERÁ romper ninguna URL existente usada por `router.push` /
  `router.replace` en el código actual (`/editions`, `/people`, `/rankings/...`, `/results/new`,
  etc.): las pantallas movidas conservan su misma URL mediante grupos de ruta de expo-router.

## R6 — No perder el acceso a sesión/cuenta al eliminar el home (regresión a evitar)

- R6.1 — Como el home plano actual (`src/app/index.tsx`) es hoy el único punto con "Cerrar
  sesión" (usuario autenticado) y con el `SignInPrompt` (invitado), al sustituirlo por las
  pestañas EL SISTEMA DEBERÁ seguir ofreciendo, desde la navegación principal, un acceso para
  **cerrar sesión** (usuario autenticado) y para **iniciar sesión con Google** (invitado).
- R6.2 — Ese acceso a cuenta/sesión DEBERÁ ser alcanzable desde las tres pestañas de forma
  coherente (p. ej. una acción en la cabecera común a las tres, hacia una pantalla de cuenta).

## R7 — No orfanar el catálogo de actividades (regresión a evitar)

- R7.1 — Como el catálogo de actividades (`/activities`, gestión CRUD de f-003) hoy solo es
  alcanzable desde el home plano, al sustituir el home EL SISTEMA DEBERÁ seguir ofreciendo un
  punto de acceso navegable al catálogo de actividades, sin necesidad de convertirlo en una
  cuarta pestaña.

## Fuera de alcance

- La lógica de listados, rankings y registro (f-001, f-002, f-004, f-005, f-006, f-007): ya
  hecha; esta feature solo la reorganiza en pestañas.
- El flujo OAuth (f-011), el modo lectura pública (f-012) y el gate de bienvenida (f-013): se
  conservan tal cual; solo se ajusta la estructura del `Stack` raíz para anidar las pestañas.
- Persistencia de la última pestaña activa entre reinicios de la app.
- Añadir nuevas pestañas más allá de las tres especificadas (Actividades NO es una pestaña).

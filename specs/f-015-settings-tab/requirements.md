# f-015 — Pestaña de Ajustes (cuenta + tema) · Requisitos (EARS)

## Contexto

Tras f-014 (`done`), la navegación principal es un grupo de rutas `(tabs)` de expo-router con
**tres** pestañas — Ediciones, Clasificaciones, Participantes — y una barra personalizada
`src/components/navigation/AppTabBar.tsx` con un FAB central de "Registrar resultado" (destino
`/results/new` si `canWrite`, `/sign-in` si no). La barra reparte hoy las pestañas con índices
fijos: `state.routes.slice(0, 2)` a la izquierda del FAB y `state.routes.slice(2, 3)` a la
derecha (pensado para exactamente 3 pestañas).

El acceso a cuenta/sesión vive hoy en un modal `src/app/account.tsx` (email + "Cerrar sesión"
si autenticado, o `<SignInPrompt />` si invitado), alcanzable desde un botón `headerRight`
(`src/components/navigation/HeaderAccountButton.tsx`) presente en las tres pestañas.

`src/theme/ThemeProvider.tsx` expone `preference: SchemePreference` (`'light' | 'dark' | 'system'`),
el `scheme` resuelto y `setPreference(next)`, que persiste en AsyncStorage bajo la key
`medallerosanpedro.themePreference`. **Hoy no existe ninguna UI que llame a `setPreference`.**

Esta feature añade una **cuarta pestaña "Ajustes"** que absorbe el contenido de cuenta/sesión
del modal `/account` y añade un selector de tema, y reorganiza la barra para repartir 2 pestañas
a cada lado del FAB. No reimplementa el flujo OAuth (f-011), el modo lectura pública (f-012) ni
la lógica de `ThemeProvider`: solo les da una superficie de UI estable.

Dependencias relevantes (todas `done`):

- `src/app/(tabs)/_layout.tsx` — `<Tabs tabBar={AppTabBar} headerShown:false>` con tres
  `Tabs.Screen` (`editions`, `rankings`, `people`).
- `src/components/navigation/AppTabBar.tsx` — barra personalizada con `TAB_CONFIG` (label/iconos
  por `route.name`) y FAB central; reparto por índices fijos 0-1 / 2.
- `src/context/AuthContext.tsx` — `useAuth()` expone `isAuthenticated`, `user`, `signOut`,
  `canWrite`, etc.
- `src/theme/ThemeProvider.tsx` — `useTheme()` expone `preference`, `scheme`, `setPreference`.
- `src/components/SignInPrompt.tsx` — tarjeta de entrada al login con Google (navega a `/sign-in`).

## R1 — Cuarta pestaña "Ajustes" en la barra inferior (AC1)

- R1.1 — CUANDO el usuario está en la navegación principal (con acceso concedido por el
  `AuthGate`: autenticado con `Person` reclamada, o invitado), EL SISTEMA DEBERÁ mostrar una
  barra de pestañas inferior con exactamente **cuatro** pestañas en este orden lógico:
  **Ediciones**, **Clasificaciones**, **Participantes** y **Ajustes**.
- R1.2 — La pestaña Ajustes DEBERÁ mostrar un icono y una etiqueta ("Ajustes") con el mismo
  estilo que las demás (color activo `colors.primary`, inactivo `colors.textTertiary`, icono
  Ionicons relleno/outline según foco).
- R1.3 — CUANDO el usuario pulsa la pestaña Ajustes, EL SISTEMA DEBERÁ mostrar la pantalla de
  Ajustes como pantalla raíz de esa pestaña, conservando la barra de pestañas visible.
- R1.4 — La pestaña Ajustes DEBERÁ ser accesible tanto para un usuario autenticado como para un
  invitado (no requiere sesión para abrirla).

## R2 — FAB central repartido 2 a la izquierda / 2 a la derecha (AC1)

- R2.1 — CUANDO se muestra la barra con las cuatro pestañas, EL SISTEMA DEBERÁ colocar el FAB
  central de "Registrar resultado" entre las dos primeras pestañas (Ediciones, Clasificaciones,
  a la izquierda) y las dos últimas (Participantes, Ajustes, a la derecha).
- R2.2 — El reparto izquierda/derecha NO DEBERÁ depender de índices codificados a mano para
  exactamente 3 pestañas (`slice(0, 2)` / `slice(2, 3)`): DEBERÁ ajustarse a las cuatro pestañas
  (generalizado por punto medio, o adaptado explícitamente a 4), de forma que cada pestaña
  conserve su `route.name`, su etiqueta, su icono, su estado de foco (`state.index`) y su
  `onPress` correctos según su índice real en `state.routes`.
- R2.3 — El comportamiento del FAB NO DEBERÁ cambiar: sigue visible siempre, navega a
  `/results/new` si `canWrite` y a `/sign-in` si no, con `accessibilityRole="button"` y
  `accessibilityLabel="Registrar resultado"`.
- R2.4 — La barra DEBERÁ seguir respetando el safe-area inferior (`insets.bottom`) y el estilo
  actual (fondo `colors.surface`, borde superior `colors.border`, sombra).

## R3 — La pestaña Ajustes absorbe el contenido de cuenta/sesión (AC2)

- R3.1 — CUANDO el usuario autenticado abre la pestaña Ajustes, EL SISTEMA DEBERÁ mostrar su
  email (`user?.email`) y un botón "Cerrar sesión" que invoque `signOut` de `useAuth`.
- R3.2 — CUANDO un visitante/invitado (no autenticado) abre la pestaña Ajustes, EL SISTEMA
  DEBERÁ mostrar el mismo punto de entrada de inicio de sesión con Google que ya existe
  (`<SignInPrompt />`, que navega a `/sign-in`).
- R3.3 — El contenido de cuenta/sesión de la pestaña Ajustes NO DEBERÁ duplicar la lógica de
  sesión: reutiliza `useAuth` (`isAuthenticated`, `user`, `signOut`) y el componente
  `SignInPrompt` ya existentes, con el mismo comportamiento que tenía el modal `/account`.

## R4 — Selector de tema claro / oscuro / sistema (AC3)

- R4.1 — La pestaña Ajustes DEBERÁ incluir un selector de tema con exactamente tres opciones:
  **Claro**, **Oscuro** y **Sistema**, correspondientes a `SchemePreference`
  (`'light' | 'dark' | 'system'`).
- R4.2 — El selector DEBERÁ reflejar la preferencia actual: la opción correspondiente a
  `preference` de `useTheme()` aparece marcada/seleccionada visualmente.
- R4.3 — CUANDO el usuario elige una opción del selector, EL SISTEMA DEBERÁ invocar
  `setPreference` de `useTheme()` con el valor correspondiente (`'light'`, `'dark'` o
  `'system'`), lo que aplica el tema de inmediato y lo persiste en AsyncStorage bajo
  `medallerosanpedro.themePreference` (comportamiento ya provisto por `ThemeProvider`, sin
  reimplementarlo).
- R4.4 — El selector de tema DEBERÁ estar disponible para cualquier usuario de la pestaña
  Ajustes (autenticado o invitado): la preferencia de tema no depende de la sesión.
- R4.5 — Cada opción del selector DEBERÁ ser accionable con accesibilidad adecuada
  (`accessibilityRole="button"` y estado de selección), con copy en español.

## R5 — Retirada del modal /account y del botón headerRight (AC4)

- R5.1 — UNA VEZ el contenido de cuenta/sesión vive en la pestaña Ajustes, EL SISTEMA DEBERÁ
  retirar el modal `src/app/account.tsx` y el botón de cabecera
  `src/components/navigation/HeaderAccountButton.tsx`, para no mantener dos puntos con la misma
  lógica de cuenta/sesión (decisión documentada en `design.md §7`).
- R5.2 — CUANDO se retira `HeaderAccountButton`, EL SISTEMA DEBERÁ eliminar su uso como
  `headerRight` en los `_layout.tsx` de las pestañas Ediciones, Clasificaciones y Participantes,
  y eliminar la entrada `Stack.Screen name="account"` del `Stack` raíz
  (`src/app/_layout.tsx`), sin dejar imports ni referencias rotas a `/account` o a
  `HeaderAccountButton` en el código.
- R5.3 — CUANDO se retiran esos archivos, EL SISTEMA DEBERÁ eliminar también su test asociado
  (`src/__tests__/app/account.test.tsx`), ya que la pantalla que verifica deja de existir.
- R5.4 — La retirada NO DEBERÁ romper ninguna otra URL ni el `AuthGate`: `/results/new`,
  `/sign-in`, `/welcome`, `/claim-person`, `/activities/*` y las rutas de pestaña se conservan
  intactas.

## Fuera de alcance

- El flujo OAuth real de Google (f-011) y su configuración en Supabase Auth (pendiente del
  usuario): la pestaña Ajustes solo ofrece el punto de entrada ya existente.
- La lógica interna de `ThemeProvider` (resolución de `scheme`, persistencia): ya hecha; esta
  feature solo añade la UI que llama a `setPreference`.
- Persistencia de la última pestaña activa entre reinicios.
- Cualquier otro ajuste de la app (notificaciones, idioma, etc.): solo cuenta/sesión + tema.

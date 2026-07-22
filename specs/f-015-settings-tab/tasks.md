# f-015 — Tareas

Orden recomendado. Marcar `[x]` al completar. Requisitos entre paréntesis (ver
`requirements.md`).

## Pestaña Ajustes (estructura + pantalla)

- [x] T1 — Crear `src/app/(tabs)/settings/_layout.tsx`: `Stack` con un único
  `Stack.Screen name="index"` titulado "Ajustes", `headerTitleAlign:'center'` y
  `contentStyle.backgroundColor = colors.background`. SIN `headerRight`. (R1.3)
- [x] T2 — Crear `src/app/(tabs)/settings/index.tsx` con dos secciones:
  (a) **Cuenta** (R3): autenticado → `user?.email` + `Button` "Cerrar sesión" (`signOut`);
  invitado → `<SignInPrompt />` (mismo cuerpo que el actual `account.tsx`).
  (b) **Tema** (R4): selector con 3 opciones Claro/Oscuro/Sistema; la opción `preference` actual
  aparece marcada; `onPress` llama a `setPreference('light'|'dark'|'system')`; accesible
  (`role=button`, estado seleccionado); visible para autenticado e invitado. (R3, R4)

## Registro de la pestaña + barra

- [x] T3 — Modificar `src/app/(tabs)/_layout.tsx`: añadir un 4º `Tabs.Screen name="settings"`
  con `title: 'Ajustes'`, tras `people`. (R1.1)
- [x] T4 — Reescribir el reparto en `src/components/navigation/AppTabBar.tsx`: añadir
  `TAB_CONFIG.settings` (label "Ajustes", iconos `settings`/`settings-outline`); sustituir
  `slice(0,2)`/`slice(2,3)` con `index` fijo por un reparto por punto medio
  (`Math.ceil(len/2)`), conservando el **índice real** de cada ruta para icono, `focused` y
  `onPress`; extraer un helper `renderTab(route, index)` para no duplicar el bloque de item. No
  cambiar el FAB ni sus estilos/accesibilidad ni el safe-area. (R2)

## Retirada de /account y HeaderAccountButton

- [x] T5 — Borrar `src/app/account.tsx`, `src/components/navigation/HeaderAccountButton.tsx` y
  `src/__tests__/app/account.test.tsx`. (R5.1, R5.3)
- [x] T6 — Quitar el import de `HeaderAccountButton` y la línea `headerRight: () => <HeaderAccountButton />`
  de `(tabs)/editions/_layout.tsx`, `(tabs)/people/_layout.tsx` y `(tabs)/rankings/_layout.tsx`.
  (R5.2)
- [x] T7 — Quitar `<Stack.Screen name="account" ... />` de `src/app/_layout.tsx` (NO tocar
  `AuthGate`). Verificar por búsqueda que no queda ninguna referencia a `/account` ni a
  `HeaderAccountButton` en `src/`. (R5.2, R5.4)

## Tests y verificación

- [x] T8 — Ampliar `src/__tests__/components/navigation/AppTabBar.test.tsx`: `buildProps` con 4
  rutas (editions, rankings, people, settings) y aserción de la etiqueta "Ajustes"; conservar los
  tests del FAB (`canWrite`→`/results/new`, `!canWrite`→`/sign-in`). (R1, R2)
- [x] T9 — Crear `src/__tests__/app/settings.test.tsx`: autenticado (email + "Cerrar sesión"
  invoca `signOut`), invitado (`SignInPrompt`, sin "Cerrar sesión"), y selector de tema (pulsar
  Oscuro/Claro/Sistema invoca `setPreference` con el valor correcto). (R3, R4)
- [x] T10 — `npx tsc --noEmit` limpio y `npm test` sin regresiones nuevas. Anotar el resultado
  (nº de suites/tests) aquí. (todos)
  - Resultado: `npx tsc --noEmit` → sin errores. `npx jest` → **32 test suites, 175 tests, todos
    en verde** (incluye la ampliación de `AppTabBar.test.tsx` a 4 rutas y el nuevo
    `settings.test.tsx`; `account.test.tsx` eliminado, 0 regresiones).

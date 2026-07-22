# f-014 — Tareas

Orden recomendado. Marcar `[x]` al completar. Requisitos entre paréntesis (ver
`requirements.md`).

## Estructura de pestañas

- [x] T1 — Crear `src/app/(tabs)/_layout.tsx`: `<Tabs>` con `tabBar={AppTabBar}`,
  `screenOptions={{ headerShown: false }}` y tres `Tabs.Screen` (`editions`, `rankings`,
  `people`) con sus `title`. (R1)
- [x] T2 — Mover con `git mv` las pantallas de sección a stacks anidados (misma URL):
  `editions/{index,new,[id]}.tsx` → `(tabs)/editions/…`; `people/{index,new,[id]}.tsx` →
  `(tabs)/people/…`; `rankings/historic.tsx`, `rankings/editions/{index,[id]}.tsx`,
  `rankings/activities/{index,[id]}.tsx` → `(tabs)/rankings/…`. No editar su contenido. (R5.1, R5.4)
- [x] T3 — Crear los `_layout.tsx` de cada pestaña como `Stack` con los títulos de header
  actuales y `headerRight` = `HeaderAccountButton` (ver design §8): `(tabs)/editions/_layout.tsx`,
  `(tabs)/people/_layout.tsx`, `(tabs)/rankings/_layout.tsx`. Conservar `presentation:'modal'`
  para `new` y `headerTitleAlign:'center'`. (R5.1, R5.2, R6.2)

## Barra de pestañas + FAB

- [x] T4 — Crear `src/components/navigation/AppTabBar.tsx`: barra personalizada con 3 items de
  pestaña (icono relleno/outline según foco, etiqueta, color activo `primary`/inactivo
  `textTertiary`), fondo `surface`, borde superior `border`, `paddingBottom = insets.bottom`, y
  FAB central elevado (circular, gradiente `gradientFrom→gradientTo` o `accent`, icono `add`
  blanco, sombra). Accesibilidad de items y del FAB. (R1, R2)
- [x] T5 — Implementar la acción del FAB con `useAuth`/`useRouter`: `canWrite` → `push('/results/new')`;
  si no → `push('/sign-in')`. FAB siempre visible en ambos casos. (R4)

## Hub de Clasificaciones

- [x] T6 — Crear `src/app/(tabs)/rankings/index.tsx`: hub con 3 `NavCard` hacia
  `/rankings/historic`, `/rankings/editions`, `/rankings/activities`, más sección "Gestión" con
  `NavCard` "Catálogo de actividades" → `/activities`. Solo lectura, accesible sin sesión.
  (R3, R7)

## Stack raíz, home y cuenta

- [x] T7 — Modificar `src/app/index.tsx`: sustituir `HomeScreen` por
  `<Redirect href="/editions" />`. (R5.4)
- [x] T8 — Modificar `src/app/_layout.tsx`: en el `<Stack>`, reemplazar las `Stack.Screen` de
  editions/people/rankings por `Stack.Screen name="(tabs)" headerShown:false`; mantener `index`,
  `welcome`, `sign-in`, `claim-person`, `results/new`, `activities/*`; añadir
  `Stack.Screen name="account"` (modal). **No** modificar el componente `AuthGate` ni su lógica.
  (R5.2, R5.3)
- [x] T9 — Crear `src/app/account.tsx` (modal): autenticado → email + "Cerrar sesión"
  (`signOut`); invitado → `<SignInPrompt />`. Y crear
  `src/components/navigation/HeaderAccountButton.tsx` (icono `person-circle-outline` →
  `push('/account')`). (R6)

## Tests y verificación

- [x] T10 — Actualizar imports de los tests de pantallas movidas (`@/app/editions/index` →
  `@/app/(tabs)/editions/index`, y análogos de people/rankings). Verificar que `@/app/(tabs)/…`
  resuelve; si no, usar import relativo. Borrar `src/__tests__/app/index.test.tsx` (el home ya no
  es pantalla de contenido). (conventions)
- [x] T11 — Añadir tests nuevos: `AppTabBar` (FAB con `canWrite`→`/results/new` y
  `!canWrite`→`/sign-in`, y 3 etiquetas de pestaña), `rankings-hub` (3 accesos + catálogo) y
  `account` (signOut vs SignInPrompt). (R2, R3, R4, R6)
- [x] T12 — `npx tsc --noEmit` limpio y `npm test` sin regresiones nuevas (los 4 fallos
  preexistentes de `index.test.tsx` desaparecen al borrarlo). Revisar manualmente que el FAB es
  visible en las 3 pestañas y respeta `canWrite`. (todos)

  Resultado: `npx tsc --noEmit` sin salida (limpio). `npx jest`: 32 suites / 171 tests, todos en
  verde (no hay regresiones; `index.test.tsx` se borró y sus 4 fallos previos desaparecieron).

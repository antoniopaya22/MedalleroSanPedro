# f-014 — Navegación por pestañas inferiores · Diseño

## 1. Resumen y estrategia

Sustituimos el home plano por un grupo de rutas `(tabs)` de expo-router anidado dentro del
`Stack` raíz. El `AuthGate` (que hoy envuelve el `Stack`) se conserva intacto y sigue teniendo
precedencia sobre las pestañas. La clave es aprovechar que **los grupos de ruta con paréntesis
(`(tabs)`) NO contribuyen a la URL**: mover `src/app/editions/index.tsx` a
`src/app/(tabs)/editions/index.tsx` mantiene su URL `/editions`, así que **todas las llamadas
`router.push('/editions')` / `router.replace('/rankings/...')` existentes siguen funcionando sin
tocarse** (R5.4). No hay lógica de negocio nueva ni acceso a datos ni cambios de RLS.

El trabajo es puramente de estructura de navegación y presentación:

1. Crear el grupo `(tabs)` con su `_layout.tsx` (navegador `Tabs`) y una barra de pestañas
   **personalizada** con 3 pestañas + FAB central.
2. Mover las pantallas de las 3 secciones a stacks anidados por pestaña (para que sus detalles
   naveguen "dentro de la pestaña", R5.1).
3. Crear la pantalla intermedia (hub) de Clasificaciones.
4. Ajustar el `Stack` raíz (`_layout.tsx`) para declarar `(tabs)` y conservar los modales y
   pantallas transversales.
5. Preservar el acceso a sesión/cuenta (R6) y al catálogo de actividades (R7), que hoy viven en
   el home que se elimina.

## 2. Decisión clave: `(tabs)` con stacks anidados por pestaña

**Decisión: grupo `(tabs)` dentro del `Stack` raíz; cada pestaña es a su vez un `Stack`
anidado que contiene su listado + sus detalles/edición.**

```
src/app/
  _layout.tsx                 Stack raíz + AuthGate (se conserva)
  index.tsx                   -> <Redirect href="/editions" />   (antes: HomeScreen)
  (tabs)/
    _layout.tsx               <Tabs tabBar={AppTabBar} headerShown:false>
                              tres Tabs.Screen: editions, rankings, people
    editions/
      _layout.tsx             Stack (index, new(modal), [id])
      index.tsx   (movido)    -> /editions
      new.tsx     (movido)    -> /editions/new  (presentation: modal)
      [id].tsx    (movido)    -> /editions/[id]
    people/
      _layout.tsx             Stack (index, new(modal), [id])
      index.tsx   (movido)    -> /people
      new.tsx     (movido)    -> /people/new    (presentation: modal)
      [id].tsx    (movido)    -> /people/[id]
    rankings/
      _layout.tsx             Stack (index(hub), historic, editions/*, activities/*)
      index.tsx   (NUEVO)     -> /rankings   (hub/menú de los 3 rankings)
      historic.tsx     (movido)          -> /rankings/historic
      editions/index.tsx  (movido)       -> /rankings/editions
      editions/[id].tsx   (movido)       -> /rankings/editions/[id]
      activities/index.tsx (movido)      -> /rankings/activities
      activities/[id].tsx  (movido)      -> /rankings/activities/[id]
  results/new.tsx             (se queda en raíz) modal transversal, destino del FAB
  activities/                 (se quedan en raíz) catálogo CRUD: index, new, [id]
  account.tsx                 (NUEVO) modal de cuenta/sesión (ver §6)
  welcome.tsx  sign-in.tsx  claim-person.tsx  +not-found.tsx   (sin cambios)
```

### Por qué este reparto

- **Stacks anidados por pestaña (R5.1):** al drilldown a `/editions/[id]` o a un ranking
  concreto, la navegación ocurre dentro del `Stack` de esa pestaña, de modo que **la barra de
  pestañas permanece visible** y cada pantalla conserva su header propio. Esto cumple
  literalmente "accesibles como stack dentro de su pestaña correspondiente".
- **`results/new` en la raíz (no en una pestaña):** es una acción **transversal** disparada por
  el FAB desde cualquier pestaña; vive en el `Stack` raíz como modal para superponerse a la
  barra de pestañas (R2/R5.2). Su lógica (`canWrite`, redirect tras guardar a `/`) no cambia.
- **`(tabs)` mantiene las URLs:** por ser grupo de ruta, no altera ninguna URL → cero cambios en
  las llamadas `router.*` existentes (R5.4). Solo cambian rutas de import en los tests (§8).
- **`index.tsx` raíz -> `<Redirect href="/editions" />`:** conserva `/` como destino válido para
  los `router.replace('/')` que ya existen (salida de `/welcome`, de `/claim-person`, y de
  `/results/new` tras guardar). Aterrizan en la pestaña Ediciones (pestaña por defecto). El
  contenido del antiguo `HomeScreen` (hero + tarjetas) se reparte entre las pestañas, el hub de
  Clasificaciones (§5), el FAB y la pantalla de cuenta (§6).

### Alternativas descartadas

- **Detalles en el `Stack` raíz (fuera de la pestaña):** más simple, pero al abrir un detalle
  desaparecería la barra de pestañas (se sale de la pestaña). El usuario permitía ambas opciones,
  pero los stacks anidados encajan mejor con "dentro de su pestaña" y con la expectativa de UX
  moderna (barra visible durante el drilldown).
- **Re-exportar las pantallas desde `(tabs)` sin moverlas:** provoca colisión de URL (dos
  archivos resolviendo `/editions`). Descartado.
- **Actividades como cuarta pestaña:** el requisito fija exactamente 3 pestañas. El catálogo se
  mantiene en la raíz con un acceso desde el hub (§7).

### Impacto en el `AuthGate` (importante: NO se toca su lógica)

`AuthGate` detecta rutas especiales con `segmentsKey.split('/')[0]` para `claim-person`,
`welcome` y `sign-in`. Esas rutas siguen colgando de la raíz (no de `(tabs)`), así que su
`segments[0]` sigue siendo su propio nombre. Las rutas de pestaña tendrán `segments[0] ===
'(tabs)'`, que no coincide con ninguna regla especial → el gate las trata como navegación normal.
`/` (redirect) tiene segmentos vacíos → tampoco coincide. **Conclusión: la lógica del `AuthGate`
no requiere cambios; solo cambian los hijos del `<Stack>`.** Debe conservarse su export (lo
consume `src/__tests__/app/_layout.test.tsx`).

## 3. `(tabs)/_layout.tsx` — navegador de pestañas

```tsx
import { Tabs } from 'expo-router';
import { AppTabBar } from '@/components/navigation/AppTabBar';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <AppTabBar {...props} />}
      screenOptions={{ headerShown: false }}   // el header lo pone el Stack anidado de cada pestaña
    >
      <Tabs.Screen name="editions" options={{ title: 'Ediciones' }} />
      <Tabs.Screen name="rankings" options={{ title: 'Clasificaciones' }} />
      <Tabs.Screen name="people" options={{ title: 'Participantes' }} />
    </Tabs>
  );
}
```

- `headerShown:false` en `Tabs` porque cada pestaña es un `Stack` anidado que aporta su propio
  header (con los títulos actuales). Así no se duplican cabeceras.
- El orden de `Tabs.Screen` fija el orden lógico; el layout visual (con el FAB) lo decide
  `AppTabBar`.

## 4. `src/components/navigation/AppTabBar.tsx` — barra personalizada con FAB (R1, R2, R4)

Barra de pestañas **personalizada** (prop `tabBar` de `Tabs`), que recibe `BottomTabBarProps`
(`state`, `descriptors`, `navigation`) de React Navigation. Motivo de ser personalizada: el FAB
central elevado y el estilo moderno no se consiguen con la barra por defecto.

Estructura y estilo:

- Contenedor: fila (`flexDirection:'row'`), fondo `colors.surface`, borde superior 1px
  `colors.border`, sombra sutil (`shadows`), `paddingBottom = insets.bottom` (R1.4) vía
  `useSafeAreaInsets`, altura de contenido ~`56–64`.
- Cuatro slots en la fila, cada uno `flex:1`, en este orden:
  1. **Ediciones** — icono Ionicons `calendar`/`calendar-outline`.
  2. **Clasificaciones** — icono `podium`/`podium-outline`.
  3. **FAB central (+)** — botón elevado (ver abajo).
  4. **Participantes** — icono `people`/`people-outline`.

  (Tres pestañas de navegación + el FAB como elemento elevado destacado en la franja central de
  la barra. Es un patrón estándar de "raised center action". El FAB debe leerse claramente como
  el elemento central destacado.)
- Cada item de pestaña: `Pressable` con icono (relleno si activo, outline si inactivo) + `Text`
  `variant="caption"`. Color activo `colors.primary`, inactivo `colors.textTertiary`. `onPress`:
  patrón estándar de React Navigation (`navigation.emit('tabPress')` y si no `preventDefault`,
  `navigation.navigate(route.name)`), respetando el `focused` de `state.index`.
  `accessibilityRole="button"`, `accessibilityState={{ selected }}`.
- **FAB (+):** `Pressable` circular (~`56x56`, `borderRadius: radius.pill`) elevado con
  `translateY` negativo (~`-16/-20`) para sobresalir por encima de la barra, con sombra
  (`shadows.md`). Fondo: `LinearGradient` `colors.gradientFrom -> colors.gradientTo` (coherente
  con el hero del tema) o `colors.accent`. Icono Ionicons `add`, color blanco, size ~30.
  `accessibilityRole="button"`, `accessibilityLabel="Registrar resultado"`.

Comportamiento del FAB (R4) — usa `useAuth()` y `useRouter()`:

```tsx
const { canWrite } = useAuth();
const router = useRouter();

const onPressFab = () => {
  if (canWrite) {
    router.push('/results/new');   // R4.1
  } else {
    router.push('/sign-in');       // R4.2 (ver nota)
  }
};
```

**Nota sobre el destino cuando `!canWrite` (R4.2):** se elige `/sign-in` y NO `/welcome`. Un
invitado que ha llegado a las pestañas tiene `guestChosen === true`; si se le enviara a
`/welcome`, el `AuthGate` lo rebotaría inmediatamente a `/` (regla 3 del gate). Además, el único
caso `!canWrite` que puede llegar a ver las pestañas es el invitado sin sesión (un autenticado
sin `Person` reclamada está retenido en `/claim-person` por el gate, con precedencia). Por tanto
`/sign-in` (modal de login de Google ya existente) es el destino correcto y sin rebote.

## 5. `(tabs)/rankings/index.tsx` — hub de Clasificaciones (NUEVO, R3)

Pantalla de solo lectura (accesible sin sesión, R3.3) que reutiliza `Screen` + `NavCard`:

- Encabezado breve (`Text variant="body" color="textSecondary"`) explicando la sección.
- Tres `NavCard` (mismo estilo que el antiguo home):
  - `icon="trophy-outline"` "Clasificación histórica" → `router.push('/rankings/historic')`.
  - `icon="podium-outline"` "Clasificación por edición" → `router.push('/rankings/editions')`.
  - `icon="game-controller-outline"` "Clasificación por actividad" →
    `router.push('/rankings/activities')`.
- Sección secundaria "GESTIÓN" (`Text variant="overline"`) con un `NavCard` adicional
  `icon="game-controller-outline"` "Catálogo de actividades" → `router.push('/activities')`
  (R7; ver §7). Se coloca aquí por afinidad de dominio (los rankings por actividad y el catálogo
  operan sobre la misma entidad `Activity`).

El `_layout.tsx` de la pestaña rankings define los títulos de header de cada pantalla anidada
(los mismos que hoy tiene el `Stack` raíz: "Clasificación histórica", "Clasificación por
edición", "Clasificación", etc.), y para el hub `index` un título "Clasificaciones".

## 6. Acceso a cuenta/sesión — `src/app/account.tsx` (NUEVO, R6)

El home actual es el único punto con "Cerrar sesión" (autenticado) y `SignInPrompt` (invitado).
Al eliminarlo hay que reubicar ese acceso o se regresa f-011/f-012/f-013.

**Decisión:** una pantalla modal `/account` en el `Stack` raíz (`presentation: 'modal'`,
`title: 'Cuenta'`) que reutiliza piezas ya existentes:

- Si `isAuthenticated`: tarjeta con `user?.email` + `<Button label="Cerrar sesión" variant="outline" onPress={signOut} />`
  (tras `signOut`, el `AuthGate` reconducirá el flujo).
- Si no: `<SignInPrompt />` (ya navega a `/sign-in`).

Acceso desde las tres pestañas (R6.2): un botón en la **cabecera** común de los tres stacks
anidados. Se implementa como un componente compartido
`src/components/navigation/HeaderAccountButton.tsx` (icono Ionicons `person-circle-outline`,
`accessibilityLabel="Cuenta"`) usado en `headerRight` del `screenOptions` de cada `_layout.tsx`
de pestaña, que hace `router.push('/account')`.

## 7. Catálogo de actividades (R7)

`activities/index|new|[id]` **se quedan en la raíz** (no se mueven, no cambian de URL). No es una
pestaña (el requisito fija 3). Su punto de acceso se añade en el hub de Clasificaciones (§5).
Al pulsarlo se hace `router.push('/activities')`, que navega sobre el `Stack` raíz (la barra de
pestañas se oculta mientras se gestiona el catálogo; es un flujo administrativo secundario y de
baja frecuencia, aceptable). Su lógica y sus guardas `canWrite` no se tocan.

## 8. `src/app/_layout.tsx` — cambios en el `Stack` raíz

- **No** se toca el componente `AuthGate` ni su `useEffect` (ver §2). Se mantiene su export.
- En `<Stack>` (dentro de `ThemedStack`), sustituir las `Stack.Screen` de las secciones movidas
  (editions/*, people/*, rankings/*) por una sola entrada del grupo de pestañas y añadir la de
  cuenta:

```tsx
<Stack.Screen name="(tabs)" options={{ headerShown: false }} />
<Stack.Screen name="index" options={{ headerShown: false }} />   // ahora es el Redirect
<Stack.Screen name="welcome" options={{ headerShown: false }} />
<Stack.Screen name="sign-in" options={{ title: 'Iniciar sesión', presentation: 'modal' }} />
<Stack.Screen name="claim-person" options={{ title: 'Reclama tu persona', headerBackVisible: false }} />
<Stack.Screen name="results/new" options={{ title: 'Registrar prueba', presentation: 'modal' }} />
<Stack.Screen name="account" options={{ title: 'Cuenta', presentation: 'modal' }} />
<Stack.Screen name="activities/index" options={{ title: 'Actividades' }} />
<Stack.Screen name="activities/new" options={{ title: 'Nueva actividad', presentation: 'modal' }} />
<Stack.Screen name="activities/[id]" options={{ title: 'Editar actividad' }} />
```

  Los títulos de editions/people/rankings pasan a los `_layout.tsx` de sus pestañas.

- `src/app/index.tsx`: reemplazar `HomeScreen` por `export default function Index() { return <Redirect href="/editions" />; }` (import `Redirect` de expo-router).

### Títulos en los `_layout.tsx` de pestaña (los mismos de hoy)

- editions: `index` "Ediciones", `new` "Nueva edición" (modal), `[id]` "Editar edición".
- people: `index` "Personas", `new` "Nueva persona" (modal), `[id]` "Editar persona".
- rankings: `index` "Clasificaciones", `historic` "Clasificación histórica",
  `editions/index` "Clasificación por edición", `editions/[id]` "Clasificación",
  `activities/index` "Clasificación por actividad", `activities/[id]` "Clasificación".

Todos con `headerTitleAlign:'center'` y `contentStyle.backgroundColor = colors.background` para
mantener la coherencia con el `screenOptions` raíz actual.

## 9. Archivos

**Nuevos:**
- `src/app/(tabs)/_layout.tsx`
- `src/app/(tabs)/editions/_layout.tsx`
- `src/app/(tabs)/people/_layout.tsx`
- `src/app/(tabs)/rankings/_layout.tsx`
- `src/app/(tabs)/rankings/index.tsx` (hub)
- `src/app/account.tsx`
- `src/components/navigation/AppTabBar.tsx`
- `src/components/navigation/HeaderAccountButton.tsx`
- Tests: `src/__tests__/components/navigation/AppTabBar.test.tsx`,
  `src/__tests__/app/rankings-hub.test.tsx`, `src/__tests__/app/account.test.tsx`.

**Movidos (git mv; misma URL):**
- `editions/{index,new,[id]}.tsx` → `(tabs)/editions/…`
- `people/{index,new,[id]}.tsx` → `(tabs)/people/…`
- `rankings/historic.tsx`, `rankings/editions/{index,[id]}.tsx`,
  `rankings/activities/{index,[id]}.tsx` → `(tabs)/rankings/…`

**Modificados:**
- `src/app/_layout.tsx` (hijos del Stack; AuthGate intacto).
- `src/app/index.tsx` → `<Redirect href="/editions" />`.
- Tests que importan pantallas movidas por ruta de archivo (§ Tests), y borrado de
  `src/__tests__/app/index.test.tsx` (el home deja de ser una pantalla de contenido; sus 4
  fallos por `SafeAreaProvider` eran preexistentes).

**Se quedan igual:** `results/new.tsx`, `activities/*`, `welcome.tsx`, `sign-in.tsx`,
`claim-person.tsx`, `+not-found.tsx`, `src/components/SignInPrompt.tsx`.

## 10. Pruebas (conventions.md)

- **`AppTabBar` (permisos, R4 — obligatorio por conventions.md al tocar gating):**
  mockeando `useAuth` y `useRouter`:
  - Con `canWrite:true`, pulsar el FAB ("Registrar resultado") llama a
    `router.push('/results/new')`.
  - Con `canWrite:false`, pulsar el FAB llama a `router.push('/sign-in')` y **NO** a
    `/results/new` (verifica el gating de escritura desde la UI).
  - Renderiza las 3 etiquetas de pestaña (Ediciones, Clasificaciones, Participantes).
  Se le pasan props mínimas de `BottomTabBarProps` mockeadas (`state` con 3 rutas,
  `navigation`, `descriptors`), o se envuelve en el navegador si resulta más simple.
- **`rankings-hub` (R3):** el hub muestra los 3 accesos y, al pulsar cada uno, hace
  `router.push` a `/rankings/historic`, `/rankings/editions`, `/rankings/activities`
  respectivamente; incluye el acceso "Catálogo de actividades" → `/activities` (R7).
- **`account` (R6):** con `isAuthenticated:true` muestra "Cerrar sesión" e invoca `signOut` al
  pulsarlo; con `isAuthenticated:false` muestra el `SignInPrompt`.
- **No romper los tests existentes** de las pantallas movidas: actualizar sus imports
  `@/app/editions/index` → `@/app/(tabs)/editions/index`, etc. Comprobar que `@/app/(tabs)/…`
  (con paréntesis) resuelve bajo `jest-expo`/TS (el mapper `@/*`→`src/*` debería resolverlo; si
  diese problemas, usar import relativo desde el test — reportar como incidencia menor, no
  bloqueante).
- Nota RNTL 14 (conventions.md): `render()` es asíncrono → `await render(...)`.
- Verificación final: `npx tsc --noEmit` limpio y `npm test` sin regresiones nuevas (los 4
  fallos preexistentes de `index.test.tsx` desaparecen al borrarse ese test).

## 11. Desviaciones de implementación (no cambian criterios de aceptación)

- **T2 (mover pantallas): `mv` en vez de `git mv`.** Todo `src/app` estaba sin trackear en git
  (primer commit del repo no incluía `src/`), así que `git mv` fallaba con "not under version
  control". Se usaron movimientos de archivo normales (`mv`), preservando exactamente el
  contenido y la URL de cada pantalla (mismo efecto que pedía la tarea; sin historial de git que
  preservar porque los archivos nunca estuvieron commiteados).
- **Import de `BottomTabBarProps`.** `expo-router` (SDK 57) vendoriza su propia copia de
  React Navigation (no hay dependencia npm `@react-navigation/bottom-tabs` en este proyecto). El
  tipo `BottomTabBarProps` no se reexporta desde el entry point `expo-router` (solo el componente
  `Tabs`, marcado además `@deprecated` en favor de `expo-router/js-tabs`); se importó desde
  `expo-router/js-tabs`, que sí lo reexporta. `Tabs` (el componente, para `(tabs)/_layout.tsx`)
  se mantiene importado desde `'expo-router'` tal cual especifica este documento.

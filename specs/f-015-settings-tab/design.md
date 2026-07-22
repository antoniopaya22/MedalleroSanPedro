# f-015 — Pestaña de Ajustes (cuenta + tema) · Diseño

## 1. Resumen y estrategia

Añadimos una cuarta pestaña dentro del grupo `(tabs)` ya existente de f-014 y reorganizamos el
reparto de pestañas alrededor del FAB. No hay lógica de negocio nueva ni acceso a datos ni
cambios de RLS: la pestaña Ajustes reutiliza `useAuth` (cuenta/sesión) y `useTheme`
(`setPreference`), que ya existen. El trabajo es de navegación + presentación:

1. Crear la pestaña `(tabs)/settings/` (Stack anidado + pantalla `index`), igual patrón que las
   otras tres pestañas.
2. Registrar el 4º `Tabs.Screen` en `(tabs)/_layout.tsx`.
3. Reescribir `AppTabBar` para repartir 2 pestañas a cada lado del FAB, generalizando el reparto
   por punto medio (sin índices duros).
4. Mover a la pantalla de Ajustes el contenido de cuenta/sesión del modal `/account` y añadir el
   selector de tema.
5. Retirar el modal `/account` y el botón `HeaderAccountButton` de las tres pestañas (evitar dos
   puntos con la misma lógica de sesión), limpiando referencias y su test.

## 2. Decisión: nombre y estructura de la carpeta de la pestaña

**Decisión: `src/app/(tabs)/settings/` con `_layout.tsx` (Stack) + `index.tsx` (pantalla).**

Se elige `settings` (URL `/settings`) por coherencia con el resto de pestañas, que son carpetas
con un `Stack` anidado propio que aporta el header (recordar que `(tabs)/_layout.tsx` usa
`headerShown: false`, así que el título "Ajustes" lo pone el Stack de la pestaña). Aunque Ajustes
no tenga pantallas de detalle hoy, mantener el mismo patrón (carpeta + `_layout.tsx` con un solo
`Stack.Screen name="index"` titulado "Ajustes") deja la puerta abierta a sub-pantallas futuras y
evita un caso especial en la estructura.

```
src/app/(tabs)/
  _layout.tsx            +1 Tabs.Screen name="settings" title "Ajustes"
  editions/   ...        (sin cambios de estructura; se les quita headerRight — §7)
  rankings/   ...
  people/     ...
  settings/              (NUEVO)
    _layout.tsx          Stack (index) title "Ajustes", headerTitleAlign:'center'
    index.tsx            pantalla de Ajustes (cuenta + tema)
```

### Orden de pestañas y reparto respecto al FAB

Orden lógico de `Tabs.Screen` (= orden de `state.routes`): `editions`, `rankings`, `people`,
`settings`. Con el FAB en el centro y reparto 2/2:

```
[ Ediciones ] [ Clasificaciones ]  (+)  [ Participantes ] [ Ajustes ]
      idx 0          idx 1                    idx 2            idx 3
```

Ajustes queda en el extremo derecho, patrón habitual. Participantes pasa de estar solo a la
derecha del FAB a compartir lado con Ajustes.

## 3. `(tabs)/_layout.tsx` — registrar la 4ª pestaña

Añadir un `Tabs.Screen` tras `people`:

```tsx
<Tabs tabBar={(props) => <AppTabBar {...props} />} screenOptions={{ headerShown: false }}>
  <Tabs.Screen name="editions" options={{ title: 'Ediciones' }} />
  <Tabs.Screen name="rankings" options={{ title: 'Clasificaciones' }} />
  <Tabs.Screen name="people" options={{ title: 'Participantes' }} />
  <Tabs.Screen name="settings" options={{ title: 'Ajustes' }} />
</Tabs>
```

## 4. `AppTabBar.tsx` — reparto 2/2 generalizado (R1, R2)

Cambios:

- **`TAB_CONFIG`:** añadir la entrada `settings`:
  ```ts
  settings: { label: 'Ajustes', iconFocused: 'settings', iconUnfocused: 'settings-outline' },
  ```
- **Reparto generalizado (R2.2):** eliminar los `state.routes.slice(0, 2)` / `slice(2, 3)` con
  `const index = 2` codificado. Calcular el punto medio y mapear conservando el **índice real**
  de cada ruta:
  ```tsx
  const mid = Math.ceil(state.routes.length / 2); // 4 rutas → 2 a cada lado
  const left = state.routes.slice(0, mid);
  const right = state.routes.slice(mid);
  ```
  Renderizar `left` (con índice real `i`) a la izquierda del FAB y `right` (con índice real
  `mid + i`) a la derecha. Como el cálculo del icono, el `focused` (`state.index === index`) y el
  `onPress` (`navigation.emit` + `navigate(route.name)`) dependen del **índice real**, hay que
  usar ese índice en ambos lados, no un `0..n` local ni un `2` fijo.
  - Con `Math.ceil(4/2) = 2` el reparto es exactamente 2/2 (R2.1). (Con 3 rutas daría 2/1, que
    coincide con el comportamiento anterior — el cambio es una generalización no destructiva.)
- **Extraer un helper de render de item** para no duplicar el bloque de `TabItem` dos veces
  (hoy está duplicado). Una función local `renderTab(route, index)` que devuelva el `<TabItem>`
  con label/icono/focused/onPress derivados de `route` + `index`, invocada en el `.map` de cada
  lado. Reduce el riesgo de que los dos lados diverjan.
- El resto (contenedor, estilos, FAB con `onPressFab` → `/results/new` | `/sign-in`,
  accesibilidad, `insets.bottom`) **no cambia** (R2.3, R2.4).

## 5. `(tabs)/settings/_layout.tsx` — Stack de la pestaña

```tsx
import { Stack } from 'expo-router';
import { useTheme } from '@/theme';

export default function SettingsTabLayout() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerTitleAlign: 'center',
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Ajustes' }} />
    </Stack>
  );
}
```

Nótese: **sin `headerRight`** (ese botón se retira en §7). Mismo `screenOptions` base que los
otros stacks de pestaña salvo por no llevar `HeaderAccountButton`.

## 6. `(tabs)/settings/index.tsx` — pantalla de Ajustes (R3, R4)

Pantalla de presentación (`Screen scroll`) con dos secciones. Reutiliza componentes de
`src/components/ui` y `SignInPrompt`.

### 6.1 Sección Cuenta (R3) — mismo contenido que el antiguo `/account`

```tsx
const { isAuthenticated, user, signOut } = useAuth();
...
{isAuthenticated ? (
  <Card>
    <View style={{ gap: spacing.sm }}>
      <Text variant="title">Tu cuenta</Text>
      <Text variant="body" color="textSecondary">{user?.email ?? 'Sesión iniciada'}</Text>
      <Button label="Cerrar sesión" variant="outline" onPress={signOut} />
    </View>
  </Card>
) : (
  <SignInPrompt />
)}
```

Es exactamente el cuerpo que hoy tiene `src/app/account.tsx` (R3.3: se traslada, no se duplica —
el modal se borra en §7).

### 6.2 Sección Tema (R4) — selector claro / oscuro / sistema

```tsx
const { preference, setPreference } = useTheme();

const OPTIONS: { value: SchemePreference; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'light',  label: 'Claro',   icon: 'sunny-outline' },
  { value: 'dark',   label: 'Oscuro',  icon: 'moon-outline' },
  { value: 'system', label: 'Sistema', icon: 'phone-portrait-outline' },
];
```

Presentación: una `Card` con `Text variant="title"` "Tema" y, debajo, las tres opciones. Cada
opción es un `Pressable` (fila con icono + label) con:

- `accessibilityRole="button"`, `accessibilityState={{ selected: preference === value }}`,
  `accessibilityLabel` = label (R4.5).
- Estilo seleccionado (R4.2): la opción activa (`preference === value`) se resalta (p. ej. fondo
  `colors.primaryMuted`, texto/icono `colors.primary`, y/o un check Ionicons `checkmark`); las
  inactivas en `colors.textSecondary`.
- `onPress={() => setPreference(value)}` (R4.3). No se implementa persistencia aquí:
  `ThemeProvider.setPreference` ya escribe en AsyncStorage.

No se introduce un componente `SegmentedControl` reutilizable nuevo (regla de convenciones: sin
abstracciones prematuras; hay un único uso). Se construye inline con `Pressable` + los `Text`/
`Ionicons` del sistema de diseño. Si el implementer ve que un `ListRow` de `src/components/ui`
encaja mejor para las filas, puede usarlo, siempre que cumpla el estado de selección y la
accesibilidad de R4.2/R4.5.

Ambas secciones se separan con `spacing.xl` (o un `Divider`). El selector de tema se muestra
siempre, autenticado o no (R4.4): va fuera del condicional `isAuthenticated`.

## 7. Retirada de `/account` y `HeaderAccountButton` (R5)

**Decisión: se retiran (recomendado por el usuario), no se mantienen como acceso alternativo.**
Justificación: mantener el modal `/account` + su `headerRight` en tres pestañas duplicaría la
lógica de cuenta/sesión que ahora vive en la pestaña Ajustes, contradiciendo "sin duplicar
lógica" (AC4) y la convención de no duplicar. La pestaña Ajustes es un punto de acceso fijo y
siempre visible, superior en descubribilidad a un icono de cabecera.

Acciones:

- **Borrar** `src/app/account.tsx`.
- **Borrar** `src/components/navigation/HeaderAccountButton.tsx`.
- **Borrar** `src/__tests__/app/account.test.tsx` (R5.3: prueba una pantalla que deja de existir).
- **Editar** `src/app/(tabs)/editions/_layout.tsx`, `(tabs)/people/_layout.tsx`,
  `(tabs)/rankings/_layout.tsx`: quitar el import de `HeaderAccountButton` y la línea
  `headerRight: () => <HeaderAccountButton />` de su `screenOptions`. El resto (`headerTitleAlign`,
  `contentStyle`, títulos, modales) se conserva.
- **Editar** `src/app/_layout.tsx`: eliminar la línea
  `<Stack.Screen name="account" options={{ title: 'Cuenta', presentation: 'modal' }} />`. **No**
  se toca el componente `AuthGate` ni ninguna otra ruta (R5.4). Su export se conserva.
- Verificar por búsqueda que no quedan referencias a `/account` ni a `HeaderAccountButton` en
  `src/` (la búsqueda previa del orchestrator solo las encontró en los archivos listados arriba).

## 8. Impacto en el `AuthGate` (no se toca)

`AuthGate` decide por `segmentsKey.split('/')[0]` sobre `claim-person`, `welcome`, `sign-in`. La
nueva ruta de pestaña `/settings` cae bajo `segments[0] === '(tabs)'`, que no coincide con
ninguna regla especial → navegación normal para autenticado-con-persona o invitado (R1.4). No se
modifica la lógica del gate. La retirada de `account` solo quita un `Stack.Screen` transversal,
no afecta al gate.

## 9. Archivos

**Nuevos:**
- `src/app/(tabs)/settings/_layout.tsx`
- `src/app/(tabs)/settings/index.tsx`
- Tests: `src/__tests__/app/settings.test.tsx` (cuenta + tema). Test de `AppTabBar` ya existe y
  se amplía (ver §10).

**Modificados:**
- `src/app/(tabs)/_layout.tsx` (+1 `Tabs.Screen`).
- `src/components/navigation/AppTabBar.tsx` (reparto 2/2 generalizado + `TAB_CONFIG.settings`).
- `src/app/(tabs)/editions/_layout.tsx`, `(tabs)/people/_layout.tsx`,
  `(tabs)/rankings/_layout.tsx` (quitar `headerRight`/import de `HeaderAccountButton`).
- `src/app/_layout.tsx` (quitar `Stack.Screen name="account"`).
- `src/__tests__/components/navigation/AppTabBar.test.tsx` (4 rutas + etiqueta "Ajustes").

**Borrados:**
- `src/app/account.tsx`
- `src/components/navigation/HeaderAccountButton.tsx`
- `src/__tests__/app/account.test.tsx`

**Sin cambios:** `src/theme/ThemeProvider.tsx` (ya expone `setPreference`),
`src/components/SignInPrompt.tsx`, `src/context/AuthContext.tsx`, `results/new.tsx`,
`activities/*`, `welcome.tsx`, `sign-in.tsx`, `claim-person.tsx`.

## 10. Pruebas (conventions.md)

- **`AppTabBar` (ampliar el test existente):** cambiar `buildProps` a **4 rutas** (`editions`,
  `rankings`, `people`, `settings`) y añadir aserción de que se renderiza la etiqueta "Ajustes".
  Conservar los tests del FAB (R2.3): `canWrite:true` → `router.push('/results/new')`,
  `canWrite:false` → `router.push('/sign-in')` y NO `/results/new`. Con 4 rutas, ambos lados del
  FAB deben renderizar sus etiquetas correctas (verifica que el reparto 2/2 no descoloca índices).
- **`settings` (R3, R4) — nuevo `src/__tests__/app/settings.test.tsx`:** mockeando `useAuth` y
  `useTheme` (o envolviendo en `ThemeProvider` real y mockeando solo `useAuth`, y `expo-router`
  para `SignInPrompt`):
  - `isAuthenticated:true` → muestra `user.email` y "Cerrar sesión" invoca `signOut`.
  - `isAuthenticated:false` → muestra el `SignInPrompt` ("Accede con tu cuenta" /
    "Iniciar sesión con Google") y NO "Cerrar sesión".
  - Selector de tema: al pulsar "Oscuro" se llama a `setPreference('dark')`; al pulsar "Claro" a
    `setPreference('light')`; al pulsar "Sistema" a `setPreference('system')`. La opción marcada
    refleja `preference`. (Si se usa `ThemeProvider` real, mockear `setPreference` es más simple
    con `jest.mock('@/theme')` exponiendo `useTheme`.)
- **`account.test.tsx`:** se **borra** (la pantalla desaparece); sus casos de cuenta quedan
  cubiertos por `settings.test.tsx` (R5.3).
- Nota RNTL 14 (conventions.md): `render()` es asíncrono → `await render(...)`.
- Verificación final: `npx tsc --noEmit` limpio y `npm test` sin regresiones nuevas.

## 11. Nota sobre la memoria de f-014 (colisión de rutas)

Existe una nota de memoria (`project_f014_route_collision.md`) sobre una colisión de rutas
mientras f-014 estaba en vuelo con rutas planas duplicadas. **Está obsoleta:** f-014 cerró
`done` eliminando las rutas planas (solo existen ya bajo `(tabs)`) y `AppTabBar` existe. Añadir
`(tabs)/settings/` NO reintroduce ninguna colisión: `/settings` no tiene equivalente plano. No es
bloqueante para f-015.

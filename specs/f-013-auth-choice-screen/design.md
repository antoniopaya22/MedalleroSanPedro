# f-013 — Pantalla previa de elección de sesión · Diseño

## 1. Resumen y estrategia

f-013 añade un **gate de bienvenida** que se interpone antes del home para visitantes sin
sesión que aún no han elegido "invitado" en la sesión actual de la app. Se apoya en piezas
ya construidas:

- OAuth de Google: `useAuth().signInWithGoogle()` (f-011).
- Modo lectura pública: la navegación anónima ya funciona (f-012).
- El `AuthGate` de `src/app/_layout.tsx` ya centraliza las redirecciones de sesión.

El trabajo es: (1) una nueva pantalla `/welcome`, (2) un componente de botón de Google con
branding oficial, (3) una señal de sesión `guestChosen` en `AuthContext`, y (4) ampliar el
`AuthGate` para redirigir a `/welcome` cuando corresponde, sin romper el gate de
`/claim-person`.

No hay lógica de negocio ni acceso a datos nuevos: no se crean servicios ni migraciones. No
se tocan RLS (esta feature no introduce escrituras).

## 2. Decisión clave: dónde vive el estado "eligió invitado"

**Decisión: estado en memoria dentro de `AuthContext`, NO persistido en disco.**

Motivos:

- El requisito (AC5/R5) pide semántica "por sesión de la app": la pantalla debe reaparecer al
  **reabrir** la app. Persistir en AsyncStorage lo rompería (el usuario nunca la volvería a
  ver tras elegir invitado una vez). Por tanto, in-memory es **más correcto** aquí que en
  disco, no un atajo.
- `AuthGate` ya consume `useAuth()`; colocar la señal en `AuthContext` evita añadir un
  provider nuevo y un segundo `useContext` en el gate.
- `signOut` debe descartar la elección de invitado (R5.4). Teniéndola en `AuthContext`, el
  propio wrapper de `signOut` la resetea de forma atómica, sin coordinar dos contextos.

Alternativas descartadas:
- **Contexto separado `SessionChoiceContext`**: más aislado conceptualmente, pero añade
  anidamiento de providers y obliga a `signOut` (en `AuthContext`) a conocer y resetear otro
  contexto. No compensa para un solo booleano.
- **Derivar del route/segmento**: frágil (no distingue "invitado elegido" de "está de paso
  por el home") y no sobrevive a navegaciones internas.
- **AsyncStorage**: contradice R5.3 (reset al reabrir).

Aunque `convenciones.md` desaconseja abstracciones prematuras, esta señal es el núcleo de la
feature y tiene dos consumidores inmediatos (el gate y la pantalla `/welcome`), más `signOut`.

### Cambios en `src/context/AuthContext.tsx`

Ampliar la interfaz `Auth`:

```ts
export interface Auth {
  // ...campos existentes...
  /** `true` si el usuario eligió "invitado" en esta sesión de la app (solo memoria). */
  guestChosen: boolean;
  /** Marca la elección de "continuar como invitado" para la sesión actual. */
  chooseGuest: () => void;
}
```

- Nuevo `useState<boolean>` `guestChosen` (inicial `false`).
- `chooseGuest = useCallback(() => setGuestChosen(true), [])`.
- Envolver `signOut`: llamar a `authService.signOut()` y después `setGuestChosen(false)`
  (R5.4). El `signOut` expuesto pasa de ser `authService.signOut` directo a un wrapper local.
- Incluir `guestChosen` y `chooseGuest` en el `useMemo` de `value` y en sus dependencias.

## 3. Nueva ruta `/welcome` — `src/app/welcome.tsx`

Pantalla completa de bienvenida (estilo onboarding), coherente con el tema (paleta trigo/
terracota). Estructura sugerida, reutilizando `@/components/ui`:

- `<Screen>` con contenido centrado verticalmente.
- Cabecera de identidad de la app: círculo con `Ionicons name="medal"` sobre
  `colors.primaryMuted` (o hero con `LinearGradient` `gradientFrom→gradientTo`, como el home),
  título (`Text variant="display"`) "MedalleroSanPedro" / "Bienvenido" y subtítulo
  (`Text variant="body" color="textSecondary"`) con el tagline de la app.
- Bloque de acciones (`gap: spacing.md`):
  - `<GoogleSignInButton onPress={handleGoogle} loading={loading} />` (ver §4).
  - `<Button label="Continuar como invitado" variant="outline" fullWidth onPress={handleGuest} />`.
- Mensaje de error condicional (`Text variant="bodySmall" color="danger"`) para R4.4.

Comportamiento:

```tsx
const { signInWithGoogle, chooseGuest } = useAuth();
const router = useRouter();

const handleGuest = () => {
  chooseGuest();          // R3.1 / R5.2
  router.replace('/');    // navega al home en modo lectura pública, sin login
};

const handleGoogle = async () => {
  setError(null);
  setLoading(true);
  try {
    await signInWithGoogle();  // R4.1; devuelve null si se cancela (R4.3) → no hacemos nada
    // En éxito, el AuthGate redirige (claim-person o home); no navegamos aquí.
  } catch {
    setError('No se ha podido iniciar sesión con Google. Inténtalo de nuevo.'); // R4.4
  } finally {
    setLoading(false);
  }
};
```

Se decide que el botón de Google **llama a `signInWithGoogle()` directamente** (mismo patrón
que `src/app/sign-in.tsx`) en lugar de navegar a `/sign-in`. Así el gate de bienvenida es
autocontenido y no abre un modal (`/sign-in` es `presentation: 'modal'`) encima de una
pantalla que el propio gate podría estar redirigiendo. `/sign-in` sigue existiendo y
accesible desde el home en modo invitado (vía `SignInPrompt`).

## 4. Botón de Google con branding oficial — `src/components/GoogleSignInButton.tsx`

El botón existente en `sign-in.tsx` (primary gradient + Ionicons `logo-google` monocromo) NO
cumple las guidelines (R2.2). Se crea un componente dedicado, fiel a Google Identity:

- Fondo blanco `#FFFFFF`, borde 1px `#747775`, radio ~4–8, altura ≥ 44 (touch target),
  padding horizontal estándar.
- Logo oficial de la "G" multicolor renderizado como SVG en código (paths oficiales), colores
  `#4285F4 / #34A853 / #FBBC05 / #EA4335`.
- Etiqueta "Continuar con Google" en tipografía sans-serif, color `#1F1F1F`, weight medium.
  (AC dice "Roboto/sans": se usa la sans-serif del sistema; no se bundlea Roboto para no
  añadir infraestructura de fuentes — decisión documentada, coherente con el fallback que la
  propia guía de Google permite.)
- `accessibilityRole="button"`, `accessibilityLabel="Iniciar sesión con Google"` (R2.3).
- Props mínimas: `{ onPress: () => void; loading?: boolean; disabled?: boolean }`. En
  `loading`, mostrar `ActivityIndicator` en lugar del contenido.

### Dependencia nueva: `react-native-svg`

El logo multicolor de Google requiere SVG (no hay asset PNG del logo en `assets/`, y un glyph
monocromo no cumple R2.2). `react-native-svg` no está aún en `package.json`. Se instala con:

```
npx expo install react-native-svg
```

Es la librería estándar soportada por Expo SDK 57. El logo se implementa como un pequeño
componente `GoogleGLogo` (Svg + Paths oficiales) dentro del mismo archivo o en
`src/components/GoogleGLogo.tsx`.

> Si por alguna razón la instalación de `react-native-svg` no fuese posible en el entorno, es
> un bloqueante a reportar al orquestador (no degradar a un icono monocromo, que incumpliría
> R2.2).

## 5. `AuthGate` — ampliación en `src/app/_layout.tsx`

Se amplía el `useEffect` del `AuthGate` añadiendo el gate de bienvenida **después** de las
reglas de `/claim-person` (que conservan precedencia, R1.4) y añadiendo `/welcome` a la lista
de `Stack.Screen`.

```tsx
const { loading, isAuthenticated, hasClaimedPerson, guestChosen } = useAuth();
// ...
useEffect(() => {
  if (loading) return;
  const root = segmentsKey.split('/')[0];
  const onClaimPerson = root === 'claim-person';
  const onWelcome = root === 'welcome';
  const onSignIn = root === 'sign-in';

  // 1) Sesión sin Person reclamada → onboarding (f-011, precedencia)
  if (isAuthenticated && !hasClaimedPerson && !onClaimPerson) {
    router.replace('/claim-person');
    return;
  }
  if (onClaimPerson && (!isAuthenticated || hasClaimedPerson)) {
    router.replace('/');
    return;
  }

  // 2) Sin sesión y sin elección de invitado → gate de bienvenida (f-013)
  //    Se exceptúa /sign-in para no interrumpir un login en curso.
  if (!isAuthenticated && !guestChosen && !onWelcome && !onSignIn) {
    router.replace('/welcome');
    return;
  }

  // 3) En /welcome pero ya hay sesión o ya eligió invitado → salir al home
  if (onWelcome && (isAuthenticated || guestChosen)) {
    router.replace('/');
  }
}, [loading, isAuthenticated, hasClaimedPerson, guestChosen, segmentsKey, router]);
```

- R1.1/R1.3: la regla (2) redirige a `/welcome` al visitante sin sesión ni elección.
- R1.4: la regla (1) va primero; un autenticado sin `Person` sigue yendo a `/claim-person`.
- R5.1/R5.2: con sesión o `guestChosen`, la regla (2) no dispara y la (3) saca de `/welcome`.
- R1.2: se mantiene el early-return con `AppLoading` mientras `loading`/`!fontsReady`.

Añadir a `<Stack>`:

```tsx
<Stack.Screen name="welcome" options={{ headerShown: false }} />
```

Se actualiza el comentario del `AuthGate` para mencionar que f-013 añade el gate de
bienvenida para visitantes sin sesión (hoy dice que sin sesión queda en modo anónimo directo).

## 6. Archivos afectados

Nuevos:
- `src/app/welcome.tsx` — pantalla de bienvenida (gate de elección).
- `src/components/GoogleSignInButton.tsx` — botón con branding oficial (incluye o importa el
  logo SVG `GoogleGLogo`).
- `src/__tests__/app/welcome.test.tsx`
- `src/__tests__/components/GoogleSignInButton.test.tsx`

Modificados:
- `src/context/AuthContext.tsx` — `guestChosen`, `chooseGuest`, wrapper de `signOut`.
- `src/app/_layout.tsx` — gate de bienvenida + `Stack.Screen name="welcome"`.
- `src/__tests__/context/AuthContext.test.tsx` — cobertura de `guestChosen`/`chooseGuest`/
  reset en `signOut`.
- `package.json` / lockfile — dependencia `react-native-svg` (vía `expo install`).

## 7. Pruebas (conventions.md)

- **`GoogleSignInButton`**: renderiza la etiqueta "Iniciar sesión con Google" / "Continuar con
  Google" y, al pulsarla, invoca `onPress`; respeta `loading` (deshabilitado/indicador).
- **`welcome`** (`src/__tests__/app/welcome.test.tsx`): mockeando `useAuth` (con
  `signInWithGoogle`, `chooseGuest`) y `useRouter`:
  - Se muestran ambas opciones (Google + "Continuar como invitado").
  - Pulsar "Continuar como invitado" llama a `chooseGuest()` y a `router.replace('/')` y NO
    llama a `signInWithGoogle` (R3.1).
  - Pulsar Google llama a `signInWithGoogle` (R4.1).
- **`AuthContext`**: ampliar `src/__tests__/context/AuthContext.test.tsx` (usando el patrón
  `Probe`): `guestChosen` arranca en `false`; tras `chooseGuest()` pasa a `true`; tras
  `signOut()` vuelve a `false` (R5.2/R5.4).
- **Gate de bienvenida**: se cubre indirectamente vía la lógica anterior; si se añade test de
  `_layout`/`AuthGate`, verificar que un estado `{ isAuthenticated:false, guestChosen:false }`
  redirige a `/welcome` y que `{ guestChosen:true }` no lo hace. (Es navegación, no una
  escritura con RLS, así que no aplica el caso de test de permisos de `conventions.md`.)
- Nota RNTL 14 (conventions.md): `render()` es asíncrono → `await render(...)`.
- Si `react-native-svg` da problemas bajo `jest-expo`, mockearlo en el test de
  `GoogleSignInButton` (`jest.mock('react-native-svg', ...)`), ya que el test solo comprueba
  la etiqueta y el `onPress`, no el trazado del logo.

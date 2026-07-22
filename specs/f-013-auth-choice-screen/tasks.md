# f-013 — Pantalla previa de elección de sesión · Tareas

- [x] 1. Instalar la dependencia del logo oficial: `npx expo install react-native-svg`. Si la
      instalación no es posible en el entorno, PARAR y reportar como bloqueante (no degradar a
      un icono monocromo). (R2.1)
      > Hecho: `npx expo install react-native-svg` completado sin errores; añadida a
      > `dependencies` en `package.json` (versión resuelta por Expo para SDK 57).
- [x] 2. Ampliar `src/context/AuthContext.tsx`: añadir a la interfaz `Auth` y al provider el
      estado en memoria `guestChosen: boolean` (inicial `false`) y `chooseGuest: () => void`
      (lo pone a `true`). Incluirlos en el `useMemo` de `value` y sus dependencias. (R3.1,
      R5.2, R5.3)
      > Hecho: `guestChosen` (useState inicial `false`) y `chooseGuest` (useCallback ->
      > `setGuestChosen(true)`) añadidos a la interfaz `Auth` y al `useMemo` de `value`, con
      > sus dependencias.
- [x] 3. En `src/context/AuthContext.tsx`, envolver `signOut` en un wrapper local que llame a
      `authService.signOut()` y luego `setGuestChosen(false)`, y exponer ese wrapper en vez de
      `authService.signOut` directo. (R5.4)
      > Hecho: `signOut` local (useCallback) llama a `authService.signOut()` y luego
      > `setGuestChosen(false)`; se expone ese wrapper en `value.signOut` en vez del de
      > `authService`.
- [x] 4. Crear `src/components/GoogleSignInButton.tsx`: botón con branding oficial de Google
      (fondo blanco `#FFFFFF`, borde `#747775`, logo "G" multicolor en SVG con los paths y
      colores oficiales, etiqueta "Iniciar sesión con Google" en sans-serif, altura ≥ 44,
      `accessibilityRole="button"`). Props `{ onPress, loading?, disabled? }`; en `loading`
      muestra un `ActivityIndicator`. (R2.1, R2.2, R2.3)
      > Hecho: `src/components/GoogleGLogo.tsx` (SVG con los 4 paths oficiales de la "G",
      > colores `#4285F4/#34A853/#FBBC05/#EA4335`) + `src/components/GoogleSignInButton.tsx`
      > (fondo `#FFFFFF`, borde `#747775`, altura 48, `accessibilityRole="button"` y
      > `accessibilityLabel="Iniciar sesión con Google"`, `ActivityIndicator` en `loading`).
- [x] 5. Crear `src/app/welcome.tsx`: pantalla completa de bienvenida (identidad de la app +
      dos acciones). "Continuar como invitado" → `chooseGuest()` + `router.replace('/')` sin
      login (R3.1). Botón Google → `signInWithGoogle()` con `loading`/`error` inline; en éxito
      no navega (lo hace el `AuthGate`); si devuelve `null` no hace nada; si lanza, muestra
      error en español. (R2, R3.1, R4.1, R4.3, R4.4)
      > Hecho: `src/app/welcome.tsx` con cabecera de identidad, `GoogleSignInButton` +
      > `Button` outline "Continuar como invitado", `handleGuest` (chooseGuest + replace('/'))
      > y `handleGoogle` (signInWithGoogle con loading/error inline, sin navegar en éxito).
- [x] 6. Ampliar el `AuthGate` en `src/app/_layout.tsx`: leer `guestChosen` de `useAuth()` y
      añadir, DESPUÉS de las reglas de `/claim-person`, la redirección a `/welcome` cuando
      `!isAuthenticated && !guestChosen && !onWelcome && !onSignIn`, y la salida de `/welcome`
      cuando `isAuthenticated || guestChosen`. Mantener el early-return de `AppLoading` y la
      precedencia de `/claim-person`. Actualizar el comentario del gate. (R1.1–R1.4, R5.1)
      > Hecho: `useEffect` del `AuthGate` ampliado con los pasos 2 y 3 de design.md §5,
      > preservando el orden y early-returns de las reglas de `/claim-person`; comentario del
      > gate actualizado para mencionar f-013.
- [x] 7. Registrar la ruta en el `<Stack>` de `src/app/_layout.tsx`:
      `<Stack.Screen name="welcome" options={{ headerShown: false }} />`. (R1.1)
      > Hecho: añadido justo después de `Stack.Screen name="index"`.
- [x] 8. Test `src/__tests__/components/GoogleSignInButton.test.tsx`: renderiza la etiqueta y
      al pulsarla invoca `onPress`; respeta `loading`. Mockear `react-native-svg` si hace
      falta para el render bajo jest-expo. (R2)
      > Hecho: 3 casos (etiqueta+rol, onPress al pulsar, loading oculta etiqueta y no dispara
      > onPress). `react-native-svg` renderiza sin problemas bajo `jest-expo`; no hizo falta
      > mockearlo.
- [x] 9. Test `src/__tests__/app/welcome.test.tsx` (mock de `useAuth` y `useRouter`): se
      muestran ambas opciones; "Continuar como invitado" llama a `chooseGuest()` +
      `router.replace('/')` y NO a `signInWithGoogle`; el botón de Google llama a
      `signInWithGoogle`. (R3.1, R4.1)
      > Hecho: 4 casos, incluyendo también R4.4 (error legible tras `signInWithGoogle`
      > rechazada). `fireEvent.press` usado con `await` (RNTL 14).
- [x] 10. Ampliar `src/__tests__/context/AuthContext.test.tsx`: `guestChosen` arranca `false`;
      tras `chooseGuest()` pasa a `true`; tras `signOut()` vuelve a `false`. (R5.2, R5.4)
      > Hecho: añadido `GuestProbe` (patrón `Probe`) con dos botones (`elegir-invitado`,
      > `cerrar-sesion`) y 2 tests nuevos que verifican el ciclo `false → true → false` y que
      > `authService.signOut` se invoca.
- [x] 11. Ejecutar `npm test` y `npx tsc --noEmit`; dejar en verde el código propio de f-013
      antes de entregar a revisión (documentar cualquier error preexistente ajeno a f-013,
      p. ej. de f-008/f-014 en curso).
      > Hecho: `npx tsc --noEmit` sin errores. `npm test` → 156 passed / 4 failed, 28 de 29
      > test suites en verde. Los 4 fallos son preexistentes y ajenos a f-013: todos en
      > `src/__tests__/app/index.test.tsx` (`HomeScreen`), que no envuelve el render en
      > `<SafeAreaProvider>` mientras `src/app/index.tsx` usa `useSafeAreaInsets()` (ese test
      > no toca ninguna ruta ni componente de f-013 — `welcome.tsx`, `GoogleSignInButton.tsx`
      > y `AuthContext.tsx` no llaman a `useSafeAreaInsets`). No se ha modificado ese test ni
      > `index.tsx` por estar fuera del alcance de esta feature. Todos los tests nuevos/
      > ampliados de f-013 (`GoogleSignInButton.test.tsx`, `welcome.test.tsx`,
      > `AuthContext.test.tsx`) pasan en verde.
- [x] 12. Corregir bloqueante de revisión (R1.2): en el `useEffect` del `AuthGate` en
      `src/app/_layout.tsx`, el guard solo comprobaba `if (loading) return;` sin tener en
      cuenta `fontsReady`, lo que podía hacer que el efecto llamase a `router.replace(...)`
      antes de montar el `Stack` si `loading` pasaba a `false` antes que `fontsReady` a
      `true` (condición de carrera "navigate before mounting the Root Layout").
      > Hecho: guard cambiado a `if (loading || !fontsReady) return;` y `fontsReady` añadido
      > al array de dependencias del efecto (`[loading, fontsReady, isAuthenticated,
      > hasClaimedPerson, guestChosen, segmentsKey, router]`). No cambia la precedencia de
      > `/claim-person` ni la excepción de `/welcome`/`/sign-in`, solo retrasa la decisión de
      > navegación hasta que ambas condiciones (`loading` y `fontsReady`) estén resueltas.
- [x] 13. Cerrar hueco de cobertura de revisión: test directo de la lógica del `AuthGate`
      (R1.1/R1.3/R1.4/R5.1), hoy solo cubierta indirectamente vía `welcome.test.tsx` y
      `AuthContext.test.tsx`.
      > Hecho: exportado `AuthGate` como named export desde `src/app/_layout.tsx` (sin tocar
      > el default export `RootLayout` ni el comportamiento en runtime) y creado
      > `src/__tests__/app/_layout.test.tsx` con mocks de `expo-router`
      > (`useRouter`/`useSegments`), `@/context/AuthContext` (`useAuth`) y
      > `@/components/AppLoading` (stub). 5 casos: (1) sin sesión/sin invitado fuera de
      > welcome/sign-in → `router.replace('/welcome')`; (2) sin sesión con `guestChosen:true`
      > → no redirige a `/welcome`; (3) con sesión sin Person reclamada estando en `/welcome`
      > → precedencia `router.replace('/claim-person')` y no navega a `/`; (4) `loading:true`
      > → no llama a `router.replace` y muestra el stub de `AppLoading`; (5) `fontsReady:false`
      > con `loading:false` → no llama a `router.replace` (regresión directa del bloqueante
      > del punto 12).

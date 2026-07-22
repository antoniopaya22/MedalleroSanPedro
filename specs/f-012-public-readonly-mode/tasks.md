# f-012 — Modo de solo lectura sin inicio de sesión · Tareas

- [x] 1. Verificar en `supabase/migrations/20260719120000_init_schema.sql` que existen las
      políticas `*_select_public` (`anon, authenticated`) para `editions`, `people`,
      `activities`, `activity_results`, `medal_awards` y que ninguna política concede
      escritura a `anon`. Documentar que no hace falta migración nueva (o crearla solo si
      hay hueco). (R1.3, R2.5)
      Verificado: las cinco políticas `*_select_public` (líneas 134-147) conceden `select`
      a `anon, authenticated`; las políticas de escritura (líneas 156-190) son todas
      `for all to authenticated using has_claimed_person()`, sin ninguna para `anon`. No
      hay hueco; no se crea migración nueva.
- [x] 2. Crear `src/components/WriteGate.tsx`: muestra `children` solo si `useAuth().canWrite`,
      si no renderiza `fallback` (por defecto `null`). (R2.1–R2.4)
- [x] 3. Crear `src/components/SignInPrompt.tsx`: `Card` con copy "Accede con tu cuenta" y
      `Button` "Iniciar sesión con Google" que hace `router.push('/sign-in')`. (R3.1, R3.2)
- [x] 4. Editar `src/app/index.tsx`: en la rama anónima usar `<SignInPrompt />` en lugar de la
      tarjeta de login inline; conservar la rama autenticada ("Tu cuenta" + cerrar sesión).
      No añadir controles de escritura. (R1.1, R3.1–R3.3)
- [x] 5. Revisar `src/app/_layout.tsx` (`AuthGate`): confirmar que sin sesión no se fuerza
      login; no cambiar el comportamiento (ajustar solo comentario si procede). (R1.1, R1.2)
      Confirmado: el `useEffect` solo redirige a `/claim-person` cuando
      `isAuthenticated && !hasClaimedPerson`; sin sesión no hay redirección. El comentario ya
      referencia f-012 ("navegación pública completa es f-012"); no se cambia comportamiento.
- [x] 6. Test `src/__tests__/components/WriteGate.test.tsx`: tres estados (anónimo oculta,
      autenticado sin `Person` oculta, `canWrite` muestra) + render de `fallback`. (R2)
- [x] 7. Test `src/__tests__/components/SignInPrompt.test.tsx`: renderiza la CTA y navega a
      `/sign-in` al pulsarla. (R3)
- [x] 8. Test de home anónimo en `src/__tests__/app/index.test.tsx` (crear o ampliar el
      existente): sin sesión se muestra la CTA de login y ningún control de escritura. (R1, R3)
- [x] 9. Ejecutar `npm test` y `npx tsc --noEmit`; todo verde antes de entregar a revisión.
      `npm test`: verde (36/36, incluye los 3 tests nuevos de esta feature). Código propio
      de f-012 (`WriteGate.tsx`, `SignInPrompt.tsx`, rama anónima de `index.tsx`): sin
      errores de tipo (confirmado por reviewer en aislamiento). `npx tsc --noEmit` a nivel de
      repo muestra 4 errores AJENOS a f-012, todos en `src/app/people/{index,new,[id]}.tsx`
      y en la línea del botón "Ver personas" de `src/app/index.tsx` (código de
      f-001-people-management, in-progress en paralelo): el tipo de rutas autogenerado de
      expo-router (`.expo/types/router.d.ts`) aún no reconoce `"/people"` como href válido.
      Es responsabilidad de f-001 (se resuelve al regenerar los tipos de ruta / terminar esa
      feature); no se toca código de f-001 para no colisionar. Veredicto del reviewer para
      f-012 en aislamiento: APTO PARA DONE.

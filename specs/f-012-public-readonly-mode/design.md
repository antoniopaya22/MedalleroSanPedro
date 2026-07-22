# f-012 — Modo de solo lectura sin inicio de sesión · Diseño

## 1. Resumen y estrategia

f-012 es transversal y se apoya casi por completo en lo ya construido en f-010 y f-011:

- **Lectura anónima** ya funciona a nivel de datos: RLS concede `SELECT` público (`anon`)
  a `editions`, `people`, `activities`, `activity_results`, `medal_awards`.
- **No se fuerza login** ya funciona a nivel de navegación: `AuthGate`
  (`src/app/_layout.tsx`) solo redirige a `/claim-person` cuando hay sesión sin `Person`;
  sin sesión deja navegar.
- **Señal de escritura** ya existe: `useAuth().canWrite` (`isAuthenticated &&
  hasClaimedPerson`) en `src/context/AuthContext.tsx`.

Por tanto el trabajo de f-012 es **consolidar estas piezas en dos primitivas reutilizables y
verificarlas con tests**, para que las features de navegación/escritura (f-001..f-008) las
consuman sin reinventar el gating:

1. `WriteGate` — envoltorio que muestra un control de escritura solo si `canWrite` (R2).
2. `SignInPrompt` — punto de entrada al login con Google visible en modo público (R3).

No hay lógica de negocio ni acceso a datos nuevos, así que no hay servicios nuevos.

## 2. RLS / backend — verificación, sin cambios

- No se crea migración nueva. Se verifica que en
  `supabase/migrations/20260719120000_init_schema.sql` siguen existiendo las políticas
  `*_select_public` (`for select to anon, authenticated using (true)`) para las cinco tablas
  de lectura pública, y que **ninguna** política concede escritura al rol `anon` (todas las
  de escritura son `for all to authenticated using (public.has_claimed_person())`).
- Esto cubre R1.3 y R2.5. La verificación efectiva contra el proyecto Supabase real (rol
  `anon` puede leer, no puede escribir) ya está documentada como paso manual del usuario en
  `supabase/README.md` (heredado de f-010); no se repite código.

## 3. `WriteGate` (R2)

Archivo nuevo: `src/components/WriteGate.tsx` (fuera de `components/ui`, porque es un
componente consciente de la sesión, no una primitiva visual pura).

```tsx
import type { ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';

interface WriteGateProps {
  children: ReactNode;
  /** Qué renderizar cuando el usuario no puede escribir. Por defecto: nada. */
  fallback?: ReactNode;
}

/**
 * Muestra sus hijos (controles de escritura) solo si el usuario puede escribir
 * (`canWrite`: autenticado y con `Person` reclamada). Para todos los demás
 * (anónimo o autenticado sin `Person`) renderiza `fallback` (por defecto null).
 * Es gating de UI (defensa en profundidad); la garantía real es RLS.
 */
export function WriteGate({ children, fallback = null }: WriteGateProps) {
  const { canWrite } = useAuth();
  return <>{canWrite ? children : fallback}</>;
}
```

- Consumidoras futuras: `<WriteGate><Button label="Crear edición" .../></WriteGate>`.
- Decisión sobre "abstracción prematura" (conventions.md): se crea con un solo uso inmediato
  porque **es el entregable central de f-012** y su razón de ser es tener 6+ usos en
  f-001..f-008; documentarlo aquí evita que cada feature duplique la condición `canWrite`.

## 4. `SignInPrompt` (R3)

Archivo nuevo: `src/components/SignInPrompt.tsx`. Extrae la tarjeta de "Accede con tu cuenta"
que hoy está inline en `src/app/index.tsx` a un componente reutilizable, para que cualquier
pantalla de navegación pública (listados, rankings de f-002/f-005/f-006/f-007) pueda
mostrar el mismo punto de entrada al login de forma consistente.

```tsx
// Card con título "Accede con tu cuenta", texto y Button "Iniciar sesión con Google"
// que hace router.push('/sign-in'). Copy de UI en español.
```

- Reutiliza `Card`, `Text`, `Button` de `@/components/ui` y `useRouter` de `expo-router`.
- No decide por sí mismo la visibilidad según sesión (lo decide el consumidor): en `index.tsx`
  se sigue mostrando en la rama `!isAuthenticated`, cumpliendo R3.3 (no aparece con sesión).

## 5. Integración en la pantalla de inicio

Editar `src/app/index.tsx`:

- Rama anónima (`!isAuthenticated`): sustituir la `Card` inline de login por `<SignInPrompt />`
  (mismo copy y navegación). Cumple R3.1/R3.2.
- Rama autenticada: se conserva la tarjeta "Tu cuenta" con "Cerrar sesión". Cumple R3.3.
- No se añaden controles de escritura a `index.tsx` (aún no hay features de escritura); la
  pantalla sigue siendo navegable sin sesión (R1.1).

## 6. `AuthGate` — sin cambios de comportamiento

`src/app/_layout.tsx` ya satisface R1.1/R1.2 (no fuerza login sin sesión). No se modifica su
lógica; a lo sumo se ajusta el comentario para referenciar que f-012 formaliza el modo
público. Se añade un test que fija este contrato para que futuras features no lo rompan.

## 7. Archivos afectados

Nuevos:
- `src/components/WriteGate.tsx`
- `src/components/SignInPrompt.tsx`
- `src/__tests__/components/WriteGate.test.tsx`
- `src/__tests__/components/SignInPrompt.test.tsx`

Modificados:
- `src/app/index.tsx` (usar `SignInPrompt`)
- `src/__tests__/app/index.test.tsx` (si existe: aserción de modo anónimo; si no, se crea)

Verificados (sin cambios):
- `supabase/migrations/20260719120000_init_schema.sql` (RLS)
- `src/app/_layout.tsx` (`AuthGate`)

## 8. Pruebas (conventions.md)

- `WriteGate`: mockear `useAuth` y verificar los tres estados — (a) anónimo → hijos ocultos /
  `fallback`; (b) autenticado sin `Person` → hijos ocultos; (c) `canWrite` → hijos visibles.
  Este es el caso de test que exige conventions.md para features que tocan permisos.
- `SignInPrompt`: renderiza la CTA "Iniciar sesión con Google" y, al pulsarla, navega a
  `/sign-in` (mock de `useRouter`).
- Home anónimo: con sesión nula, se muestra la CTA de login y ningún control de escritura.
- Nota sobre RNTL 14 (conventions.md): `render()` es asíncrono → `await render(...)`.
- Verificación real de RLS `anon` (lee sí / escribe no) es paso manual del usuario contra
  Supabase, ya documentado en `supabase/README.md`.

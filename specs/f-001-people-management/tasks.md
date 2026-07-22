# f-001-people-management — Tareas

Checklist ordenado. Marcar `- [x]` un item a la vez, nunca en bloque.

## Servicios

- [x] Añadir `listPeople()` en `src/services/people.ts` (`select('*').order('name')`, reutiliza `mapRow`, lanza en error) (R4.1/R4.3)
- [x] Añadir `createPerson(name)` en `src/services/people.ts` (`trim`, `insert({ name })`, `.select('*').single()`, devuelve `Person`; no envía `active` ni `claimed_by_user_id`) (R1.2)
- [x] Añadir `updatePerson(id, { name?, active? })` en `src/services/people.ts` (payload solo con claves presentes, nunca `claimed_by_user_id`; `trim` del name; `.eq('id', id).select('*').single()`) (R2.1/R2.2/R3.1/R2.4)

## Pantallas

- [x] Crear `src/app/people/index.tsx`: listado del roster con `listPeople`, `Badge` para inactivas, botón "Añadir persona" y filas editables solo si `canWrite`, `EmptyState` en vacío, recarga al enfocar (R1.1/R4/R5.1/R5.2/R5.3)
- [x] Crear `src/app/people/new.tsx`: guarda `canWrite` (redirect si no), `TextField` nombre + validación no-vacío, `createPerson`, manejo de error de backend (R1.1/R1.3/R1.4/R5.1/R5.2)
- [x] Crear `src/app/people/[id].tsx`: guarda `canWrite`, renombrar con validación (R3), alternar `active` con `updatePerson` y copy de "no borra el histórico" (R2.1/R2.2/R2.3)
- [x] Registrar las rutas `people/index`, `people/new`, `people/[id]` en `src/app/_layout.tsx`
- [x] Añadir acceso al roster ("Personas" → `/people`) en `src/app/index.tsx` (visible para todos)

## Tests

- [x] Ampliar `src/__tests__/services/people.test.ts`: casos de `listPeople`, `createPerson`, `updatePerson` (incluye que `updatePerson` nunca envía `claimed_by_user_id`); mantener verdes los de `listClaimablePeople`/`claimPerson`
- [x] Crear `src/__tests__/app/people/index.test.tsx`: `canWrite=false` oculta "Añadir persona"; `canWrite=true` lo muestra (mock de `@/context/AuthContext` y `@/services/people`, `await render`)
- [x] Ampliar `src/__tests__/app/people/index.test.tsx`: una `Person` con `active=false` renderiza el `Badge` "Inactiva" (R4.2), a raíz de hueco señalado por el reviewer (interacción/estado no cubierto por los tests iniciales)
- [x] Crear `src/__tests__/app/people/new.test.tsx`: guarda de escritura (`canWrite=false` no muestra el formulario y redirige a `/people/index`; `canWrite=true` sí muestra `TextField`/botón "Crear") y validación de nombre (nombre vacío no llama a `createPerson` y muestra el mensaje de validación; nombre válido sí llama a `createPerson` con el nombre) — mock de `@/context/AuthContext`, `@/services/people` y `expo-router`, a raíz de hueco señalado por el reviewer

## Verificación

- [x] `npm run typecheck` y `npm test` en verde
- [x] Añadir nota en `supabase/README.md`: el alta y el marcar-inactiva de `people` quedan cubiertos por la verificación manual de escritura de f-011 (usuario sin `Person`/`anon` no puede escribir en `people`) — sin migración nueva

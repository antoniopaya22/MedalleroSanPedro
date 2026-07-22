# f-002 — Gestión de ediciones (años) · Requisitos (EARS)

## Contexto

Una `Edition` es la entidad raíz del medallero (un año/edición), bajo la que se registran
los resultados (`ActivityResult`) de esa edición. Esta feature aporta el CRUD de ediciones:
`year` (entero único), `label` opcional, `startDate`/`endDate` opcionales. Cualquier usuario
autenticado con su `Person` reclamada puede crear/editar; anónimos y autenticados sin `Person`
reclamada solo leen.

Depende de `f-011-auth-google-sso` (done), que expone `useAuth().canWrite`
(`isAuthenticated && hasClaimedPerson`) en `src/context/AuthContext.tsx`. Se apoya en
`f-010-supabase-setup` (done): la tabla `public.editions` ya existe con columnas
`id, year int not null unique, label text, start_date date, end_date date, created_at`,
RLS de lectura pública (`editions_select_public`, rol `anon` + `authenticated`) y de
escritura restringida (`editions_write_claimed_person`, `for all to authenticated using
public.has_claimed_person()`). **No se requiere migración nueva.** Reutiliza el patrón de
gating de UI de `f-012` (`canWrite`, `WriteGate` en `src/components/WriteGate.tsx`).

## R1 — Crear una edición con año único (AC1)

- R1.1 — CUANDO un usuario con `canWrite === true` rellena el formulario de nueva edición con
  un año válido que aún no existe y confirma, EL SISTEMA DEBERÁ crear una nueva `Edition` con
  ese `year` (y `label`, `startDate`, `endDate` si se indican) y persistirla en `editions`.
- R1.2 — CUANDO se intenta crear una edición con un `year` que ya pertenece a otra edición, EL
  SISTEMA DEBERÁ rechazar la operación sin crear una segunda edición y mostrar un mensaje claro
  de año duplicado. La unicidad la garantiza el constraint `unique(year)` de f-010 (violación
  Postgres `23505`), que el servicio traduce a un error reconocible por la UI.
- R1.3 — CUANDO el campo año está vacío o no es un entero válido, EL SISTEMA DEBERÁ NO enviar la
  petición y mostrar un error de validación en el propio campo.
- R1.4 — CUANDO `label`, `startDate` o `endDate` se dejan vacíos, EL SISTEMA DEBERÁ persistir
  `null` en esas columnas (son opcionales, ver `docs/domain-model.md`).
- R1.5 — CUANDO se indican `startDate` y `endDate` y la fecha de fin es anterior a la de inicio,
  EL SISTEMA DEBERÁ mostrar un error de validación y no guardar.

## R2 — Editar una edición existente (AC1)

- R2.1 — CUANDO un usuario con `canWrite === true` modifica `year`, `label`, `startDate` o
  `endDate` de una edición existente y guarda, EL SISTEMA DEBERÁ persistir únicamente los campos
  cambiados y devolver la edición actualizada.
- R2.2 — CUANDO se cambia el `year` de una edición a uno ya usado por otra edición distinta, EL
  SISTEMA DEBERÁ rechazar con el mismo mensaje de año duplicado que R1.2, sin aplicar el cambio.

## R3 — Listado ordenado de más reciente a más antigua (AC2)

- R3.1 — CUANDO cualquier usuario abre el listado de ediciones, EL SISTEMA DEBERÁ mostrar todas
  las ediciones ordenadas por `year` de forma descendente (la más reciente primero).
- R3.2 — CUANDO no existe ninguna edición, EL SISTEMA DEBERÁ mostrar un estado vacío informativo
  en lugar de una lista vacía.
- R3.3 — CUANDO el usuario vuelve al listado tras crear o editar una edición, EL SISTEMA DEBERÁ
  reflejar el cambio (recarga al enfocar la pantalla).

## R4 — Lectura pública, escritura restringida (AC3)

- R4.1 — CUANDO un visitante anónimo, o un usuario autenticado sin `Person` reclamada, abre el
  listado de ediciones, EL SISTEMA DEBERÁ mostrarlo (lectura pública vía `editions_select_public`).
- R4.2 — CUANDO `canWrite === false`, EL SISTEMA DEBERÁ NO renderizar ningún control de crear ni
  editar ediciones (ni el botón "Añadir edición", ni la navegación de fila a la pantalla de edición).
- R4.3 — CUANDO se solicita directamente la ruta `/editions/new` o `/editions/[id]` sin
  `canWrite`, EL SISTEMA DEBERÁ redirigir al listado sin renderizar el formulario (defensa en
  profundidad, mismo patrón que `people/new` y `people/[id]`).
- R4.4 — La ocultación de controles en la UI es defensa en profundidad; la garantía real de que
  un anónimo (o autenticado sin `Person` reclamada) no puede escribir la aporta la política RLS
  `editions_write_claimed_person` de f-010, no la ausencia del botón. Ninguna acción de escritura
  debe depender solo del gating de UI.
- R4.5 — CUANDO el rol `anon` (o un autenticado sin `Person` reclamada) intenta un `INSERT`/
  `UPDATE` sobre `editions`, la política RLS DEBERÁ rechazarlo. La verificación efectiva contra
  el proyecto Supabase real es un paso manual del usuario ya documentado en `supabase/README.md`
  (heredado de f-010); esta feature no cambia el esquema ni las políticas.

## Fuera de alcance

- Borrado de ediciones: no lo pide `feature_list.json` (una edición es la raíz de resultados;
  borrarla en cascada es delicado y no es un criterio de aceptación). CRUD aquí = crear, leer,
  actualizar.
- El detalle de una edición con sus `ActivityResult`/rankings (f-004, f-005): la pantalla
  `/editions/[id]` de esta feature es el formulario de edición, no la vista de resultados.
- Cambios de esquema o de políticas RLS: la tabla `editions` de f-010 ya cubre año único,
  etiqueta y fechas con RLS. No se crea migración salvo que se detecte un hueco.

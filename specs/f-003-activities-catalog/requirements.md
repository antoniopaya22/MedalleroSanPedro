# f-003-activities-catalog — Requisitos (EARS)

Gestión del catálogo de actividades/juegos (`Activity`): alta, renombrado y
lectura pública, más un buscador para reutilizar una actividad existente en vez
de crear un duplicado. Restringida a usuarios autenticados con `Person`
reclamada para escribir. Deriva de las `acceptance_criteria` de
`feature_list.json` y de los ADR
[0002](../../docs/decisions/0002-google-sso-person-claim.md) y
[0005](../../docs/decisions/0005-remove-admin-role.md), y del modelo de dominio
([docs/domain-model.md](../../docs/domain-model.md)).

Notación: `CUANDO <condición> EL SISTEMA DEBERÁ <respuesta observable>`.

## R1 — Alta de una nueva Activity

- **R1.1** CUANDO un usuario autenticado con `Person` reclamada abre la pantalla
  de gestión del catálogo de actividades EL SISTEMA DEBERÁ ofrecer un control
  visible para añadir una nueva `Activity`.
- **R1.2** CUANDO ese usuario introduce un nombre no vacío y confirma el alta EL
  SISTEMA DEBERÁ crear una nueva `Activity` con ese nombre (recortando espacios)
  y reflejarla en el catálogo.
- **R1.3** CUANDO el usuario intenta confirmar el alta con un nombre vacío o solo
  espacios EL SISTEMA DEBERÁ impedir la creación y mostrar un mensaje de
  validación, sin llamar al backend.
- **R1.4** CUANDO la creación de una `Activity` falla en el backend EL SISTEMA
  DEBERÁ mostrar un mensaje de error y NO DEBERÁ dejar el catálogo en un estado
  inconsistente.
- **R1.5** CUANDO el usuario intenta crear una `Activity` cuyo nombre coincide
  —ignorando mayúsculas/minúsculas y espacios sobrantes— con el de una `Activity`
  ya existente EL SISTEMA DEBERÁ impedir el duplicado y mostrar un mensaje
  reconocible que invite a reutilizar la existente (es el propósito central de la
  feature: no crear duplicados). La garantía real es un índice único
  case-insensitive sobre `activities(lower(name))` (ver `design.md`), no solo la
  comprobación de UI.

## R2 — Búsqueda para reutilizar una Activity existente

- **R2.1** CUANDO el usuario escribe un término de búsqueda sobre el catálogo EL
  SISTEMA DEBERÁ mostrar las `Activity` cuyo nombre contenga ese término
  (coincidencia insensible a mayúsculas/minúsculas), de modo que pueda localizar
  y seleccionar una actividad existente en vez de escribir su nombre de cero.
- **R2.2** CUANDO el término de búsqueda está vacío EL SISTEMA DEBERÁ mostrar el
  catálogo completo ordenado por nombre (R4.2).
- **R2.3** CUANDO el usuario está dando de alta una `Activity` y su nombre
  coincide (parcial o totalmente, case-insensitive) con actividades ya
  existentes EL SISTEMA DEBERÁ mostrarle esas coincidencias antes de crear, para
  que reutilice una en lugar de duplicar (materializa R1.5 en el flujo de alta).
- **R2.4** El uso de este buscador **dentro del flujo de registro de un
  resultado** (elegir la `Activity` al crear un `ActivityResult`) se implementa
  en `f-004-medal-results-registration`, que depende de f-003; f-003 entrega el
  primitivo reutilizable de búsqueda (`searchActivities`) y su uso dentro del
  propio catálogo. Ver "Fuera de alcance (delegado)".

## R3 — Edición del nombre

- **R3.1** CUANDO un usuario autenticado con `Person` reclamada edita el nombre
  de una `Activity` con un valor no vacío y confirma EL SISTEMA DEBERÁ actualizar
  el nombre y reflejarlo en el catálogo.
- **R3.2** CUANDO el usuario intenta guardar un nombre vacío o solo espacios EL
  SISTEMA DEBERÁ impedir el guardado y mostrar un mensaje de validación.
- **R3.3** CUANDO el usuario intenta renombrar una `Activity` a un nombre que
  colisiona (case-insensitive, sin espacios sobrantes) con el de otra `Activity`
  existente EL SISTEMA DEBERÁ impedir el guardado y mostrar el mismo mensaje
  reconocible de duplicado de R1.5.

## R4 — Visibilidad del catálogo (lectura pública)

- **R4.1** CUANDO cualquier usuario (anónimo, autenticado sin `Person`
  reclamada, o autenticado con `Person` reclamada) abre la pantalla del catálogo
  EL SISTEMA DEBERÁ mostrar la lista de actividades (la lectura de `activities`
  es pública, ADR 0003).
- **R4.2** El catálogo DEBERÁ presentarse en un orden estable y predecible (por
  nombre).

## R5 — Escritura solo con Person reclamada (UI + RLS)

- **R5.1** MIENTRAS un usuario esté sin sesión (rol `anon`) EL SISTEMA NO DEBERÁ
  mostrar ni permitir accionar ningún control de alta o edición de `Activity`, ni
  desde la UI ni a nivel de política RLS.
- **R5.2** MIENTRAS un usuario autenticado no haya reclamado su `Person` EL
  SISTEMA NO DEBERÁ mostrar ni permitir accionar ningún control de escritura
  sobre `Activity`, ni desde la UI ni a nivel de política RLS.
- **R5.3** CUANDO la capa de UI decide mostrar u ocultar los controles de
  escritura del catálogo EL SISTEMA DEBERÁ basarse en la señal `canWrite` del
  contexto de auth (f-011), de modo que los controles solo sean visibles para un
  usuario con `Person` reclamada. El buscador y la lectura del catálogo son
  visibles para todos.
- **R5.4** La garantía real de que anónimos y autenticados sin `Person`
  reclamada no puedan crear ni editar actividades DEBERÁ recaer en la política
  RLS `activities_write_claimed_person` (existente desde f-010, apoyada en
  `has_claimed_person()`), no solo en el ocultado de la UI.

## Fuera de alcance (delegado)

- **Selección de la actividad al registrar un resultado**: el consumo del
  buscador dentro del formulario de alta de `ActivityResult` es de
  `f-004-medal-results-registration` (depende de f-003). f-003 no construye ese
  formulario; solo entrega el servicio `searchActivities` y el buscador del
  propio catálogo (R2.4).
- **Borrado físico de actividades**: no se implementa en esta versión (igual que
  f-001 no borra personas). `activity_results.activity_id` referencia
  `activities` con `on delete restrict`, de modo que borrar una actividad usada
  rompería el histórico; el catálogo es reutilizable y persistente (ver
  `docs/domain-model.md`). Solo alta y renombrado.
- **Normalización/deduplicación del histórico importado** (variantes de
  mayúsculas y erratas de `historico-medallas.xlsx`): es de
  `f-008-historical-data-import`. f-003 solo evita duplicados *nuevos* creados
  desde la app mediante el índice único case-insensitive; ese mismo índice le
  sirve de red a f-008, pero la lógica de normalización de las variantes
  históricas no vive aquí.
- **Estado activa/inactiva de `Activity`**: el dominio no define un flag `active`
  para actividades (a diferencia de `Person`); no se introduce aquí.

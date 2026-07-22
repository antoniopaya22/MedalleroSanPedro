# f-001-people-management — Requisitos (EARS)

Gestión del roster de personas (`Person`): alta de nuevas personas y baja lógica
(marcar inactiva) sin borrar su histórico de medallas, restringida a usuarios
autenticados con `Person` reclamada. Deriva de las `acceptance_criteria` de
`feature_list.json` y de los ADR
[0002](../../docs/decisions/0002-google-sso-person-claim.md) y
[0005](../../docs/decisions/0005-remove-admin-role.md), y del modelo de dominio
([docs/domain-model.md](../../docs/domain-model.md)).

Notación: `CUANDO <condición> EL SISTEMA DEBERÁ <respuesta observable>`.

## R1 — Alta de una nueva Person

- **R1.1** CUANDO un usuario autenticado con `Person` reclamada abre la pantalla de
  gestión de personas EL SISTEMA DEBERÁ ofrecer un control visible para añadir una
  nueva `Person`.
- **R1.2** CUANDO ese usuario introduce un nombre no vacío y confirma el alta EL
  SISTEMA DEBERÁ crear una nueva `Person` con ese nombre, `active = true` y
  `claimedByUserId = null`, y reflejarla en el listado del roster.
- **R1.3** CUANDO el usuario intenta confirmar el alta con un nombre vacío o solo
  espacios EL SISTEMA DEBERÁ impedir la creación y mostrar un mensaje de validación,
  sin llamar al backend.
- **R1.4** CUANDO la creación de una `Person` falla en el backend EL SISTEMA DEBERÁ
  mostrar un mensaje de error y NO DEBERÁ dejar el listado en un estado inconsistente.

## R2 — Baja lógica (marcar inactiva) preservando el histórico

- **R2.1** CUANDO un usuario autenticado con `Person` reclamada marca una `Person`
  como inactiva EL SISTEMA DEBERÁ fijar `active = false` en esa `Person` sin eliminar
  la fila ni ninguno de sus `MedalAward`/`ActivityResult` históricos.
- **R2.2** CUANDO un usuario autenticado con `Person` reclamada marca de nuevo como
  activa una `Person` inactiva EL SISTEMA DEBERÁ fijar `active = true` (la baja lógica
  es reversible).
- **R2.3** EL SISTEMA NO DEBERÁ ofrecer un borrado físico (hard delete) de una
  `Person` en esta versión: la baja del roster se modela siempre como `active = false`
  para no perder el histórico (criterio de aceptación 2).
- **R2.4** CUANDO se modifica el nombre o el estado `active` de una `Person` EL
  SISTEMA NO DEBERÁ alterar su `claimedByUserId` (la reclamación de identidad es ajena
  a la gestión del roster y solo la muta la RPC `claim_person` de f-011).

## R3 — Edición del nombre

- **R3.1** CUANDO un usuario autenticado con `Person` reclamada edita el nombre de una
  `Person` con un valor no vacío y confirma EL SISTEMA DEBERÁ actualizar el nombre y
  reflejarlo en el listado.
- **R3.2** CUANDO el usuario intenta guardar un nombre vacío o solo espacios EL
  SISTEMA DEBERÁ impedir el guardado y mostrar un mensaje de validación.

## R4 — Visibilidad del roster

- **R4.1** CUANDO cualquier usuario (anónimo, autenticado sin `Person` reclamada, o
  autenticado con `Person` reclamada) abre la pantalla de gestión de personas EL
  SISTEMA DEBERÁ mostrar el listado del roster, incluyendo tanto personas activas como
  inactivas (la lectura de `people` es pública, ADR 0003).
- **R4.2** EL SISTEMA DEBERÁ distinguir visualmente en el listado las personas
  inactivas de las activas.
- **R4.3** El listado DEBERÁ presentar las personas en un orden estable y predecible
  (por nombre).

## R5 — Escritura solo con Person reclamada (UI + RLS)

- **R5.1** MIENTRAS un usuario esté sin sesión (rol `anon`) EL SISTEMA NO DEBERÁ
  mostrar ni permitir accionar ningún control de alta, edición o cambio de estado de
  `Person`, ni desde la UI ni a nivel de política RLS.
- **R5.2** MIENTRAS un usuario autenticado no haya reclamado su `Person` EL SISTEMA NO
  DEBERÁ mostrar ni permitir accionar ningún control de escritura sobre `Person`, ni
  desde la UI ni a nivel de política RLS.
- **R5.3** CUANDO la capa de UI decide mostrar u ocultar los controles de escritura del
  roster EL SISTEMA DEBERÁ basarse en la señal `canWrite` del contexto de auth (R4.3 de
  f-011), de modo que los controles solo sean visibles para un usuario con `Person`
  reclamada.
- **R5.4** La garantía real de que anónimos y autenticados sin `Person` reclamada no
  puedan crear ni editar personas DEBERÁ recaer en la política RLS
  `people_write_claimed_person` (existente desde f-010, apoyada en
  `has_claimed_person()`), no solo en el ocultado de la UI.

## Fuera de alcance (delegado)

- Navegación pública completa y punto de entrada al roster desde el resto de la app:
  `f-012-public-readonly-mode`. En f-001 basta con una ruta accesible al listado.
- Borrado físico de personas, fusión/deduplicación de personas y edición de
  `claimedByUserId`: no forman parte de esta versión (ver R2.3, R2.4).
- Unicidad de nombre de `Person`: el dominio admite nombres repetidos (ver
  `docs/domain-model.md`); no se impone constraint ni validación de duplicados aquí.
- Cualquier cambio de esquema o de políticas RLS: f-001 reutiliza el esquema de
  `people` y la política de escritura ya creados en f-010/f-011 (ver `design.md`).

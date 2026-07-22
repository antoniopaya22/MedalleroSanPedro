# f-017-person-detail-view - Requisitos (EARS)

La ruta `/people/[id]` deja de ser el formulario de edicion de una `Person` y pasa
a ser una **vista de detalle publica** de un participante: resumen de medallas
(agregando todas las ediciones, misma fila que en f-006) e historico de pruebas en
las que participo, con un FAB para alta rapida de resultado preseleccionando a esta
persona como participante, y el formulario de edicion reubicado en `/people/[id]/edit`.
Mismo patron de reestructuracion de rutas y de gating `canWrite` que f-016.

## R1 - Vista de detalle de un participante

- **R1.1** CUANDO cualquier usuario pulsa una persona en el listado `/people` EL SISTEMA DEBERA navegar a `/people/[id]` (la vista de detalle), no al formulario de edicion.
- **R1.2** CUANDO se abre `/people/[id]` EL SISTEMA DEBERA mostrar la cabecera del participante (nombre y, si la persona esta inactiva, un indicador de "Inactiva").
- **R1.3** CUANDO se abre `/people/[id]` EL SISTEMA DEBERA mostrar el resumen de medallas de esa persona agregando **todas** las ediciones: desglose de oros, platas y bronces, total de medallas, numero de participaciones y promedio de medallas por participacion.
- **R1.4** CUANDO se calcula el resumen de medallas EL SISTEMA DEBERA usar la misma agregacion que el ranking historico de f-006 (`buildRanking`), reutilizando `listHistoricRanking` sin duplicar la logica de agregacion.
- **R1.5** CUANDO se abre `/people/[id]` EL SISTEMA DEBERA mostrar el historico de pruebas (`ActivityResult`) en las que participo esa persona, indicando para cada una la edicion (ano y, si existe, etiqueta), la actividad y la medalla obtenida por la persona (oro/plata/bronce) o el hecho de que participo sin medalla.
- **R1.6** CUANDO se muestra el historico de pruebas EL SISTEMA DEBERA ordenarlo de mas reciente a mas antiguo (edicion mas reciente primero y, dentro del mismo ano, por `played_at` descendente con los nulos al final), mismo criterio que `listActivityHistory` de f-007.

## R2 - Acceso publico

- **R2.1** CUANDO el usuario no tiene sesion (o esta autenticado sin `Person` reclamada) EL SISTEMA DEBERA permitirle ver la vista de detalle completa (cabecera + resumen + historico), igual que los rankings publicos de f-006/f-007.
- **R2.2** CUANDO se registra un nuevo resultado que afecta a la persona EL SISTEMA DEBERA recalcular el detalle al volver a enfocar la vista (patron `useFocusEffect`).

## R3 - FAB de alta rapida de resultado

- **R3.1** CUANDO el usuario tiene `canWrite` (autenticado con `Person` reclamada) y la persona mostrada esta activa EL SISTEMA DEBERA mostrar en la vista de detalle un FAB accionable de alta de resultado.
- **R3.2** CUANDO el usuario pulsa ese FAB EL SISTEMA DEBERA navegar a `/results/new` pasando a esta persona como participante preseleccionado.
- **R3.3** CUANDO se abre `/results/new` con una persona preseleccionada EL SISTEMA DEBERA anadirla automaticamente a los participantes al cargar, sin romper el flujo normal (abrir `/results/new` sin persona preseleccionada, o con edicion preseleccionada de f-016, sigue funcionando).
- **R3.4** CUANDO el usuario NO tiene `canWrite` (anonimo o autenticado sin `Person` reclamada) EL SISTEMA DEBERA ocultar el FAB de la vista de detalle (no debe ser accionable).
- **R3.5** CUANDO la persona mostrada esta inactiva EL SISTEMA DEBERA ocultar el FAB, porque una persona inactiva no puede seleccionarse como participante de un nuevo resultado (el formulario de alta solo lista personas activas); la vista de detalle y su historico siguen siendo visibles.

## R4 - Formulario de edicion reubicado

- **R4.1** CUANDO el usuario con `canWrite` quiere editar una persona (nombre, activa/inactiva) EL SISTEMA DEBERA ofrecerselo en la ruta `/people/[id]/edit`, con el mismo comportamiento de guardado que el formulario actual (validacion de nombre no vacio, alternar `active`).
- **R4.2** CUANDO un usuario sin `canWrite` intenta abrir `/people/[id]/edit` EL SISTEMA DEBERA impedirle el acceso (redirigir fuera del formulario), como defensa en profundidad junto a la politica RLS `people_write_claimed_person`.
- **R4.3** CUANDO el usuario con `canWrite` esta en la vista de detalle `/people/[id]` EL SISTEMA DEBERA ofrecerle un punto de entrada visible a `/people/[id]/edit`; ese punto de entrada NO debe mostrarse a usuarios sin `canWrite`.

## R5 - Casos borde

- **R5.1** CUANDO la persona no ha participado todavia en ninguna prueba EL SISTEMA DEBERA mostrar el resumen de medallas en ceros y un estado vacio claro para el historico (no un error), manteniendo visible la cabecera y, si procede, el FAB.
- **R5.2** CUANDO el `id` de persona no existe EL SISTEMA DEBERA mostrar un mensaje de "persona no encontrada" en vez de fallar, sin FAB ni acceso al formulario de edicion.
- **R5.3** CUANDO la persona esta marcada como inactiva EL SISTEMA DEBERA seguir mostrando su detalle y su historico completo (el historico es del pasado y no se oculta por inactividad); la inactividad solo afecta a los controles de escritura (FAB, ver R3.5).
- **R5.4** CUANDO falla la carga de datos EL SISTEMA DEBERA mostrar un error recuperable (reintentar), sin bloquear la navegacion.

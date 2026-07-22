# f-016-edition-detail-view - Requisitos (EARS)

La ruta `/editions/[id]` deja de ser el formulario de edicion de metadatos y pasa
a ser una **vista de detalle publica** de una edicion (participantes + clasificacion),
con un FAB para alta rapida de resultado y el formulario de metadatos reubicado en
`/editions/[id]/edit`.

## R1 - Vista de detalle de una edicion

- **R1.1** CUANDO cualquier usuario pulsa una edicion en el listado `/editions` EL SISTEMA DEBERA navegar a `/editions/[id]` (la vista de detalle), no al formulario de edicion.
- **R1.2** CUANDO se abre `/editions/[id]` EL SISTEMA DEBERA mostrar la cabecera de la edicion (ano y, si existe, etiqueta).
- **R1.3** CUANDO se abre `/editions/[id]` EL SISTEMA DEBERA mostrar la lista de participantes de esa edicion (personas con al menos un `ActivityResult` en la edicion) junto a su clasificacion: desglose de oros, platas y bronces, numero de participaciones y promedio de medallas por participacion.
- **R1.4** CUANDO se muestra la clasificacion de la edicion EL SISTEMA DEBERA ordenarla con el mismo criterio que f-005 (puntos, luego oro, plata, bronce, total, promedio, nombre), reutilizando `listEditionRanking`.

## R2 - Acceso publico

- **R2.1** CUANDO el usuario no tiene sesion (o esta autenticado sin `Person` reclamada) EL SISTEMA DEBERA permitirle ver la vista de detalle completa (cabecera + participantes + clasificacion), igual que f-005.
- **R2.2** CUANDO se registra un nuevo resultado en la edicion EL SISTEMA DEBERA recalcular el detalle al volver a enfocar la vista (patron `useFocusEffect`).

## R3 - FAB de alta rapida de resultado

- **R3.1** CUANDO el usuario tiene `canWrite` (autenticado con `Person` reclamada) EL SISTEMA DEBERA mostrar en la vista de detalle un FAB accionable de alta de resultado.
- **R3.2** CUANDO el usuario pulsa ese FAB EL SISTEMA DEBERA navegar a `/results/new` pasando la edicion actual como preseleccionada.
- **R3.3** CUANDO se abre `/results/new` con una edicion preseleccionada EL SISTEMA DEBERA fijar esa edicion como seleccionada por defecto en el formulario, sin romper el flujo normal (abrir `/results/new` sin edicion preseleccionada sigue funcionando).
- **R3.4** CUANDO el usuario NO tiene `canWrite` (anonimo o autenticado sin `Person` reclamada) EL SISTEMA DEBERA ocultar el FAB de la vista de detalle (no debe ser accionable).

## R4 - Formulario de edicion de metadatos reubicado

- **R4.1** CUANDO el usuario con `canWrite` quiere editar los metadatos (ano/etiqueta/fechas) de una edicion EL SISTEMA DEBERA ofrecerselo en la ruta `/editions/[id]/edit`, con el mismo comportamiento de guardado que el formulario actual (incluida la validacion de ano unico y de fechas).
- **R4.2** CUANDO un usuario sin `canWrite` intenta abrir `/editions/[id]/edit` EL SISTEMA DEBERA impedirle el acceso (redirigir fuera del formulario), como defensa en profundidad junto a la politica RLS `editions_write_claimed_person`.
- **R4.3** CUANDO el usuario con `canWrite` esta en la vista de detalle `/editions/[id]` EL SISTEMA DEBERA ofrecerle un punto de entrada visible a `/editions/[id]/edit` (p. ej. accion en cabecera o boton); ese punto de entrada NO debe mostrarse a usuarios sin `canWrite`.

## R5 - Casos borde

- **R5.1** CUANDO la edicion no tiene todavia ningun `ActivityResult` (lista de participantes vacia) EL SISTEMA DEBERA mostrar un estado vacio claro (no un error) manteniendo visible la cabecera y, si procede, el FAB.
- **R5.2** CUANDO el `id` de edicion no existe EL SISTEMA DEBERA mostrar un mensaje de "edicion no encontrada" en vez de fallar.
- **R5.3** CUANDO falla la carga de datos EL SISTEMA DEBERA mostrar un error recuperable (reintentar), sin bloquear la navegacion.

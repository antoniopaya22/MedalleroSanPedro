# f-019-results-wizard-flow - Requisitos (EARS)

La ruta `/results/new` (hoy un formulario largo con scroll unico, f-004) pasa a ser un
**asistente por pasos (wizard)**: un paso a la vez, con navegacion Siguiente/Atras y un
indicador de progreso. NO cambia la logica de negocio ni las validaciones ya existentes
(`createActivityResult`, `participantIds`/`medalAwards`), ni la preseleccion por parametro
`editionId` (f-016) / `participantId` (f-017). Solo reorganiza la interaccion: cuando se
muestra cada bloque, y la regla de no avanzar sin completar el paso actual. El resultado
guardado es identico en estructura y validacion al de f-004.

## R1 - Asistente por pasos

- **R1.1** CUANDO cualquier usuario con `canWrite` abre `/results/new` EL SISTEMA DEBERA mostrar un asistente que presenta **un paso a la vez**, no el formulario largo con scroll unico de hoy.
- **R1.2** EL SISTEMA DEBERA ordenar los pasos exactamente asi: (1) Edicion, (2) Actividad (buscar/crear), (3) Participantes, (4) Medallas (oro, plata y bronce juntas en un unico paso), (5) Detalles (fecha/notas), (6) Resumen.
- **R1.3** CUANDO el usuario esta en cualquier paso salvo el ultimo (Resumen) EL SISTEMA DEBERA mostrar una accion **Siguiente** para avanzar al paso posterior.
- **R1.4** CUANDO el usuario esta en cualquier paso salvo el primero (Edicion) EL SISTEMA DEBERA mostrar una accion **Atras** para volver al paso anterior sin perder las selecciones ya hechas.
- **R1.5** EL SISTEMA DEBERA mostrar en todo momento un indicador visible de en que paso esta el usuario y cuantos pasos hay en total (p. ej. "Paso X de 6" mas una barra o dots de progreso).

## R2 - Interaccion de cada paso (identica a f-004)

- **R2.1** CUANDO el usuario esta en el paso Edicion EL SISTEMA DEBERA listar las ediciones y permitir seleccionar una, igual que hoy (`ListRow` con `selected`).
- **R2.2** CUANDO el usuario esta en el paso Actividad EL SISTEMA DEBERA permitir buscar por nombre entre las actividades existentes, seleccionar una, y crear una nueva (mismo `handleCreateActivity`, misma gestion de `ActivityNameTakenError`), igual que hoy.
- **R2.3** CUANDO el usuario esta en el paso Participantes y toca una persona EL SISTEMA DEBERA anadirla o quitarla del conjunto de participantes, igual que hoy (`toggleParticipant`, incluida la retirada de sus medallas al deseleccionarla).
- **R2.4** CUANDO el usuario esta en el paso Medallas y toca una persona bajo un color EL SISTEMA DEBERA marcarla o desmarcarla para ese color, igual que hoy (`toggleMedal`, oro/plata/bronce en el mismo paso), listando solo a las personas que son participantes.
- **R2.5** CUANDO el usuario esta en el paso Detalles EL SISTEMA DEBERA permitir introducir fecha (opcional) y notas (opcional), igual que hoy.

## R3 - Validacion de avance (no avanzar sin completar el paso obligatorio)

- **R3.1** CUANDO el usuario intenta avanzar desde el paso Edicion sin edicion seleccionada EL SISTEMA DEBERA impedir el avance y mostrar el mismo mensaje que hoy: "Elige una edicion.".
- **R3.2** CUANDO el usuario intenta avanzar desde el paso Actividad sin actividad seleccionada EL SISTEMA DEBERA impedir el avance y mostrar el mismo mensaje que hoy: "Elige una actividad.".
- **R3.3** CUANDO el usuario intenta avanzar desde el paso Participantes sin ningun participante seleccionado EL SISTEMA DEBERA impedir el avance y mostrar el mismo mensaje que hoy: "Selecciona al menos un participante.".
- **R3.4** CUANDO el usuario intenta avanzar desde el paso Medallas sin ninguna medalla asignada EL SISTEMA DEBERA impedir el avance y mostrar el mismo mensaje que hoy: "Asigna al menos una medalla.".
- **R3.5** EL SISTEMA DEBERA permitir avanzar desde el paso Detalles sin restriccion (fecha y notas son opcionales, igual que hoy).
- **R3.6** CUANDO el usuario corrige la seleccion que faltaba y vuelve a intentar avanzar EL SISTEMA DEBERA limpiar el mensaje de error y dejarle continuar.

## R4 - Paso de Resumen y guardado

- **R4.1** CUANDO el usuario llega al paso Resumen EL SISTEMA DEBERA mostrar un repaso de lo elegido: edicion, actividad, participantes y medallas por color (oro/plata/bronce), y la fecha/notas si se introdujeron.
- **R4.2** CUANDO el usuario esta en el paso Resumen EL SISTEMA DEBERA ofrecer el boton de **Guardar prueba**, que invoca el `createActivityResult` existente con exactamente el mismo payload que hoy (`editionId`, `activityId`, `participantIds`, `playedAt`, `notes`, `medalAwards` filtrados a colores con al menos una persona).
- **R4.3** CUANDO desde el Resumen el usuario vuelve a un paso anterior y cambia una seleccion EL SISTEMA DEBERA reflejar ese cambio en el Resumen al volver a el (el Resumen es un reflejo del estado actual, no una copia congelada).
- **R4.4** CUANDO el guardado termina con exito EL SISTEMA DEBERA cerrar el asistente (`router.back()`), igual que hoy.
- **R4.5** CUANDO el guardado falla EL SISTEMA DEBERA permanecer en el paso Resumen y mostrar el error con el mismo tratamiento que hoy (mensaje del `Error` o "No se ha podido registrar la prueba."), sin perder ninguna seleccion.

## R5 - Preseleccion por parametro (f-016 / f-017)

- **R5.1** CUANDO se abre `/results/new` con `editionId` valido (desde el FAB del detalle de edicion, f-016) EL SISTEMA DEBERA arrancar con esa edicion ya seleccionada, igual que hoy.
- **R5.2** CUANDO se abre `/results/new` con `participantId` valido de una persona activa (desde el FAB del detalle de persona, f-017) EL SISTEMA DEBERA arrancar con esa persona ya anadida a participantes, igual que hoy (una persona inactiva o inexistente se ignora, sin romper).
- **R5.3** CUANDO se abre `/results/new` con una preseleccion que resuelve un paso obligatorio EL SISTEMA DEBERA arrancar el asistente en un paso posterior al ya resuelto por la preseleccion, o al menos con esa seleccion ya hecha, sin obligar al usuario a re-elegir lo que ya venia preseleccionado. La regla concreta de paso inicial se fija en `design.md`.
- **R5.4** CUANDO se abre `/results/new` sin ningun parametro de preseleccion EL SISTEMA DEBERA arrancar el asistente en el primer paso (Edicion), sin selecciones previas.

## R6 - Permisos y equivalencia con f-004

- **R6.1** CUANDO un usuario sin `canWrite` (anonimo o autenticado sin `Person` reclamada) intenta abrir `/results/new` EL SISTEMA DEBERA impedirle el acceso (redirigir a `/`), como hoy; la garantia real de permiso sigue siendo la politica RLS de escritura, no este ocultado de UI.
- **R6.2** EL SISTEMA DEBERA producir un resultado guardado identico en estructura y validacion al del formulario de f-004: mismas reglas de negocio (una persona con medalla es participante, una persona no recibe dos medallas distintas en la misma prueba, participacion sin medalla explicita) garantizadas por el mismo `createActivityResult`, sin duplicar ni modificar esa logica.

## R7 - Casos borde

- **R7.1** CUANDO fallan las cargas iniciales (`listEditions`/`listActivities`/`listPeople`) EL SISTEMA DEBERA mostrar el mismo error que hoy ("No se han podido cargar los datos para registrar la prueba."), sin arrancar el asistente en un estado roto.
- **R7.2** CUANDO el usuario deselecciona en el paso Participantes a alguien que ya tenia medalla asignada EL SISTEMA DEBERA quitar tambien esa medalla (comportamiento actual de `toggleParticipant`), de modo que el paso Medallas y el Resumen queden coherentes.
- **R7.3** CUANDO el usuario retrocede a un paso ya completado EL SISTEMA DEBERA conservar la seleccion previa de ese paso (el estado del asistente es unico y compartido entre pasos, no se reinicia al navegar Atras/Siguiente).
- **R7.4** CUANDO el usuario esta guardando (paso Resumen, `saving` en curso) EL SISTEMA DEBERA evitar guardados duplicados, igual que hoy (boton en estado `loading`/deshabilitado).

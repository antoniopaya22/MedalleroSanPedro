# f-020-edition-detail-tabs - Requisitos (EARS)

La vista de detalle de edicion `/editions/[id]` (f-016) se divide en dos pestanas
internas: **Clasificacion** (la lista ya existente de f-016/f-005 mas un toggle
"Por puntos"/"Por promedio" reutilizando `sortRanking`) y **Actividades** (el
historico de las pruebas jugadas en esa edicion concreta: actividad, numero de
participantes y medallas con los nombres de sus ganadores, de la mas reciente a la
mas antigua). La cabecera (ano/label), el boton "Editar edicion" y el FAB de alta de
resultado quedan **fuera** de las pestanas y no cambian su comportamiento respecto a
f-016. Mismo patron de pestanas por estado local `activeTab` que ya usa
`/people/[id]` (addendum de f-018).

## R1 - Estructura de pestanas

- **R1.1** CUANDO se abre `/editions/[id]` EL SISTEMA DEBERA mostrar la vista de detalle dividida en dos pestanas seleccionables: "Clasificacion" y "Actividades".
- **R1.2** CUANDO el usuario selecciona una pestana EL SISTEMA DEBERA mostrar su contenido y mantener oculto el de la otra, gestionando la pestana activa con estado local (mismo patron `activeTab` que `/people/[id]`), sin recargar datos del backend al cambiar de pestana.
- **R1.3** CUANDO se abre `/editions/[id]` EL SISTEMA DEBERA arrancar en la pestana "Clasificacion" por defecto.
- **R1.4** CUANDO se cargan los datos EL SISTEMA DEBERA obtener tanto la clasificacion como el historico de actividades en la misma carga inicial (patron `useFocusEffect` ya existente), de modo que cambiar de pestana no dispare nuevas consultas.

## R2 - Pestana Clasificacion

- **R2.1** CUANDO la pestana "Clasificacion" esta activa EL SISTEMA DEBERA mostrar la misma lista de f-016/f-005 (posicion, desglose de oros/platas/bronces, puntos, participaciones y promedio de medallas por participacion), reutilizando `listEditionRanking` y el componente presentacional `EditionRankingList` sin duplicarlo.
- **R2.2** CUANDO la pestana "Clasificacion" tiene resultados EL SISTEMA DEBERA ofrecer un toggle con dos opciones, "Por puntos" y "Por promedio", con el mismo patron visual que el ranking historico (f-006) y el de actividad (f-007).
- **R2.3** CUANDO el usuario alterna ese toggle EL SISTEMA DEBERA reordenar la misma lista en cliente mediante `sortRanking` ("Por puntos" -> modo `medals`, "Por promedio" -> modo `average`), sin volver a consultar el backend.
- **R2.4** CUANDO la edicion no tiene ninguna prueba registrada (clasificacion vacia) EL SISTEMA DEBERA mostrar en la pestana "Clasificacion" su propio estado vacio claro (no un error) y no mostrar el toggle de orden.

## R3 - Pestana Actividades

- **R3.1** CUANDO la pestana "Actividades" esta activa EL SISTEMA DEBERA mostrar el historico de las pruebas (`ActivityResult`) jugadas en esa edicion concreta, indicando para cada una el nombre de la actividad, el numero de participantes y las medallas otorgadas con los nombres de sus ganadores.
- **R3.2** CUANDO se resuelven las medallas de cada prueba EL SISTEMA DEBERA presentarlas en el orden fijo oro, plata, bronce, con la lista de ganadores por color (mismo formato que el historico por actividad de f-007).
- **R3.3** CUANDO se muestra el historico de la edicion EL SISTEMA DEBERA ordenarlo de la prueba mas reciente a la mas antigua por `played_at` descendente, con las pruebas sin `played_at` al final; al tratarse de una unica edicion no procede ordenar por ano.
- **R3.4** CUANDO se obtiene el historico de la edicion EL SISTEMA DEBERA usar una funcion nueva paralela a `listActivityHistory` (p. ej. `listEditionHistory(editionId)`) que filtra `activity_results` por `edition_id`, reutilizando la resolucion de medallas/ganadores ya escrita en `listActivityHistory` sin duplicarla.
- **R3.5** CUANDO la edicion no tiene ninguna prueba registrada EL SISTEMA DEBERA mostrar en la pestana "Actividades" su propio estado vacio claro (no un error), independiente del de la pestana "Clasificacion".

## R4 - Elementos fuera de las pestanas

- **R4.1** CUANDO se abre `/editions/[id]` EL SISTEMA DEBERA mostrar la cabecera de la edicion (ano y, si existe, etiqueta) fuera de las pestanas, visible en ambas.
- **R4.2** CUANDO el usuario tiene `canWrite` EL SISTEMA DEBERA mostrar el boton "Editar edicion" (acceso a `/editions/[id]/edit`) fuera de las pestanas, visible independientemente de la pestana activa, con el mismo gating y comportamiento que en f-016.
- **R4.3** CUANDO el usuario tiene `canWrite` EL SISTEMA DEBERA mostrar el FAB de alta de resultado (navega a `/results/new` con la edicion preseleccionada) fuera de las pestanas, visible independientemente de la pestana activa, con el mismo gating y comportamiento que en f-016.
- **R4.4** CUANDO el usuario NO tiene `canWrite` (anonimo o autenticado sin `Person` reclamada) EL SISTEMA DEBERA ocultar tanto el boton "Editar edicion" como el FAB, sin afectar a la visibilidad de las dos pestanas.

## R5 - Acceso publico y casos borde

- **R5.1** CUANDO el usuario no tiene sesion (o esta autenticado sin `Person` reclamada) EL SISTEMA DEBERA permitirle ver ambas pestanas completas (clasificacion e historico de actividades), igual que f-005/f-007.
- **R5.2** CUANDO se registra un nuevo resultado en la edicion EL SISTEMA DEBERA recalcular ambas pestanas al volver a enfocar la vista (patron `useFocusEffect`), manteniendo la pestana activa seleccionada.
- **R5.3** CUANDO el `id` de edicion no existe EL SISTEMA DEBERA mostrar un mensaje de "edicion no encontrada" en vez de fallar, sin pestanas ni FAB (mismo comportamiento que f-016 R5.2).
- **R5.4** CUANDO falla la carga de datos EL SISTEMA DEBERA mostrar un error recuperable (reintentar), sin bloquear la navegacion (mismo patron que f-016 R5.3).
